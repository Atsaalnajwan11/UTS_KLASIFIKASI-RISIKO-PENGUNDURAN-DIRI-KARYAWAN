# Klasifikasi Risiko Pengunduran Diri Karyawan Berdasarkan Data HR Menggunakan Random Forest

Aplikasi web analitik prediktif berbasis **Python (Flask)** dan **Scikit-Learn (Random Forest Classifier)** untuk mendeteksi risiko pengunduran diri karyawan (*Employee Attrition*) menggunakan dataset **IBM HR Analytics Employee Attrition & Performance** (1.470 data karyawan, 35 atribut).

## Struktur Proyek
```text
Klasifikasi_Risiko_Attrition_HR_RF/
├── app.py                      # Aplikasi Web Flask & REST API Prediksi
├── train_model.py              # Script Pelatihan & Evaluasi Model Random Forest
├── requirements.txt            # Daftar dependensi Python
├── Procfile                    # Konfigurasi deployment (Render / Railway / Heroku)
├── data/
│   └── WA_Fn-UseC_-HR-Employee-Attrition.csv
├── models/
│   ├── rf_attrition_model.joblib
│   └── model_metadata.json
├── notebooks/
│   └── Klasifikasi_Attrition_Random_Forest.ipynb  # Siap dijalankan di Google Colab
├── static/
│   ├── css/style.css
│   ├── js/main.js
│   └── images/
│       ├── confusion_matrix.png
│       ├── roc_curve.png
│       └── feature_importance.png
└── templates/
    └── index.html
```

## Cara Menjalankan di Komputer Lokal
1. Ekstrak folder proyek dan buka terminal di dalam direktori `Klasifikasi_Risiko_Attrition_HR_RF`.
2. Instal seluruh dependensi:
   ```bash
   pip install -r requirements.txt
   ```
3. (Opsional) Latih ulang model dari awal:
   ```bash
   python train_model.py
   ```
4. Jalankan server aplikasi web:
   ```bash
   python app.py
   ```
5. Buka browser dan akses `http://127.0.0.1:5000`.

website dan vidio penjelasan
website
```bash
https://prediction-attrition.vercel.app/
```
Vidio penjelasan(youtube)
```bash

```
