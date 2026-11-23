import os
import json
import joblib
import pandas as pd
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "rf_attrition_model.joblib")
META_PATH = os.path.join(BASE_DIR, "models", "model_metadata.json")
DATA_PATH = os.path.join(BASE_DIR, "data", "WA_Fn-UseC_-HR-Employee-Attrition.csv")

# Load trained model & metadata
model_bundle = joblib.load(MODEL_PATH)
rf_pipeline = model_bundle["pipeline"]
optimal_threshold = model_bundle["threshold"]
feature_columns = model_bundle["feature_columns"]

with open(META_PATH, "r", encoding="utf-8") as f:
    metadata = json.load(f)


def generate_hr_recommendations(payload, risk_prob):
    """Menghasilkan analisis faktor risiko dan rekomendasi retensi HR berdasarkan profil karyawan."""
    reasons = []
    actions = []

    if payload.get("OverTime") == "Yes":
        reasons.append("Karyawan bekerja lembur (OverTime = Yes), faktor terkuat pemicu burnout dan attrition.")
        actions.append("Evaluasi distribusi beban kerja dan terapkan kompensasi atau batasan jam lembur bulanan.")

    income = float(payload.get("MonthlyIncome", 0))
    if income < 4000:
        reasons.append(f"Pendapatan bulanan (${income:,.0f}) berada di bawah rata-rata karyawan bertahan ($6,833).")
        actions.append("Tinjau kesetaraan remunerasi (benchmarking gaji) dan skema insentif berbasis kinerja.")

    job_sat = int(payload.get("JobSatisfaction", 3))
    env_sat = int(payload.get("EnvironmentSatisfaction", 3))
    wlb = int(payload.get("WorkLifeBalance", 3))

    if job_sat <= 2:
        reasons.append(f"Tingkat kepuasan kerja rendah (Skor {job_sat}/4).")
        actions.append("Lakukan sesi 1-on-1 untuk pemetaan jalur karier, rotasi tugas, atau pengayaan peran.")

    if env_sat <= 2:
        reasons.append(f"Kepuasan terhadap lingkungan kerja rendah (Skor {env_sat}/4).")
        actions.append("Audit iklim tim dan fasilitas kerja bersama manajer departemen terkait.")

    if wlb <= 2:
        reasons.append(f"Keseimbangan kehidupan kerja kurang optimal (WorkLifeBalance {wlb}/4).")
        actions.append("Pertimbangkan fleksibilitas jam kerja atau opsi kerja hibrida.")

    years_promo = int(payload.get("YearsSinceLastPromotion", 0))
    years_comp = int(payload.get("YearsAtCompany", 0))
    if years_comp >= 4 and years_promo >= 3:
        reasons.append(f"Belum mendapatkan promosi selama {years_promo} tahun dari total masa kerja {years_comp} tahun.")
        actions.append("Susun rencana pengembangan kompetensi dan evaluasi kelayakan promosi jabatan.")

    if not reasons:
        if risk_prob >= optimal_threshold:
            reasons.append("Kombinasi usia, masa kerja, dan struktur kompensasi menunjukkan kecenderungan mobilitas karier.")
            actions.append("Lakukan stay interview proaktif untuk menjaga keterikatan (employee engagement).")
        else:
            reasons.append("Indikator kompensasi, beban lembur, dan kepuasan kerja berada dalam zona stabil.")
            actions.append("Pertahankan program apresiasi rutin dan peluang pengembangan profesional berkelanjutan.")

    return reasons[:3], actions[:3]


def classify_risk_tier(prob):
    pct = round(prob * 100, 1)
    if prob >= 0.55:
        return {
            "level": "Risiko Tinggi (High Risk)",
            "badge": "danger",
            "prediction_label": "Berpotensi Mengundurkan Diri (Yes)",
            "probability_pct": pct,
            "summary": "Probabilitas attrition melampaui ambang kritis. Diperlukan intervensi retensi segera dari tim HR."
        }
    elif prob >= optimal_threshold:
        return {
            "level": "Risiko Sedang (Watchlist)",
            "badge": "warning",
            "prediction_label": "Waspada Potensi Resign (Yes)",
            "probability_pct": pct,
            "summary": "Probabilitas melewati ambang deteksi optimal model (32.7%). Disarankan pemantauan berkala."
        }
    else:
        return {
            "level": "Risiko Rendah (Stabil)",
            "badge": "success",
            "prediction_label": "Cenderung Bertahan (No)",
            "probability_pct": pct,
            "summary": "Profil karyawan menunjukkan tingkat retensi yang baik dan risiko pengunduran diri rendah."
        }


@app.route("/")
def index():
    return render_template("index.html", meta=metadata)


@app.route("/api/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Payload JSON tidak valid"}), 400

        # Susun input lengkap dengan nilai median default untuk fitur sekunder
        row = {}
        for col in feature_columns:
            if col in data and data[col] != "":
                if col in metadata["numerical_defaults"]:
                    row[col] = float(data[col])
                else:
                    row[col] = str(data[col])
            else:
                if col in metadata["numerical_defaults"]:
                    row[col] = float(metadata["numerical_defaults"][col])
                else:
                    row[col] = metadata["categorical_options"][col][0]

        input_df = pd.DataFrame([row])[feature_columns]
        prob_yes = float(rf_pipeline.predict_proba(input_df)[0][1])

        tier = classify_risk_tier(prob_yes)
        reasons, actions = generate_hr_recommendations(row, prob_yes)

        return jsonify({
            "status": "success",
            "result": tier,
            "reasons": reasons,
            "actions": actions,
            "threshold_pct": round(optimal_threshold * 100, 1)
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/sample-employees", methods=["GET"])
def sample_employees():
    """Mengambil 6 contoh profil karyawan riil dari dataset IBM HR untuk simulasi cepat."""
    df = pd.read_csv(DATA_PATH)
    resign_samples = df[df["Attrition"] == "Yes"].head(3)
    stay_samples = df[df["Attrition"] == "No"].head(3)
    combined = pd.concat([resign_samples, stay_samples])

    samples = []
    for _, r in combined.iterrows():
        item = {col: r[col] for col in feature_columns}
        item["ActualAttrition"] = r["Attrition"]
        item["EmployeeNumber"] = int(r["EmployeeNumber"])
        samples.append(item)

    return jsonify({"samples": samples})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
