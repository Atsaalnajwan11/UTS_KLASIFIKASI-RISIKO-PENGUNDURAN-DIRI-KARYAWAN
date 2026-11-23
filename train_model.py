import os
import json
import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report,
    precision_recall_curve, roc_curve
)

def main():
    print("=== TRAINING MODEL: KLASIFIKASI RISIKO PENGUNDURAN DIRI KARYAWAN (RANDOM FOREST) ===")
    data_path = os.path.join("data", "WA_Fn-UseC_-HR-Employee-Attrition.csv")
    df = pd.read_csv(data_path)
    print(f"Dataset dimuat: {df.shape[0]} baris, {df.shape[1]} kolom")

    # 1. Hapus kolom konstan / ID yang tidak relevan untuk prediksi
    drop_cols = ['EmployeeCount', 'EmployeeNumber', 'Over18', 'StandardHours']
    df_clean = df.drop(columns=drop_cols).copy()
    df_clean['Attrition_Binary'] = df_clean['Attrition'].map({'Yes': 1, 'No': 0})

    X = df_clean.drop(columns=['Attrition', 'Attrition_Binary'])
    y = df_clean['Attrition_Binary']

    categorical_cols = X.select_dtypes(include=['object']).columns.tolist()
    numerical_cols = X.select_dtypes(exclude=['object']).columns.tolist()

    # 2. Stratified Train-Test Split (80% Latih, 20% Uji)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    # 3. Preprocessing Pipeline
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numerical_cols),
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), categorical_cols)
        ]
    )

    # 4. Random Forest Classifier dengan Balanced Subsample untuk data tidak seimbang
    rf_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', RandomForestClassifier(
            n_estimators=300,
            max_depth=8,
            min_samples_split=8,
            min_samples_leaf=4,
            class_weight='balanced_subsample',
            random_state=42,
            n_jobs=-1
        ))
    ])

    rf_pipeline.fit(X_train, y_train)

    # 5. Evaluasi Model & Optimasi Threshold F1-Score
    y_proba = rf_pipeline.predict_proba(X_test)[:, 1]
    precisions, recalls, thresholds = precision_recall_curve(y_test, y_proba)
    f1_scores = 2 * (precisions * recalls) / (precisions + recalls + 1e-9)
    best_idx = np.argmax(f1_scores)
    best_thresh = float(thresholds[best_idx])

    y_pred = (y_proba >= best_thresh).astype(int)

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred)
    rec = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    roc_auc = roc_auc_score(y_test, y_proba)
    cm = confusion_matrix(y_test, y_pred)

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_auc = cross_val_score(rf_pipeline, X_train, y_train, cv=cv, scoring='roc_auc').mean()

    print(f"\n[Hasil Evaluasi Data Uji]")
    print(f"Optimal Threshold : {best_thresh:.4f}")
    print(f"Accuracy          : {acc*100:.2f}%")
    print(f"Precision         : {prec*100:.2f}%")
    print(f"Recall (Sensitivity): {rec*100:.2f}%")
    print(f"F1-Score          : {f1*100:.2f}%")
    print(f"ROC-AUC           : {roc_auc:.4f} (5-Fold CV AUC: {cv_auc:.4f})")
    print("\nClassification Report:\n", classification_report(y_test, y_pred, target_names=['Bertahan (No)', 'Resign (Yes)']))

    # 6. Simpan Model Bundle
    os.makedirs("models", exist_ok=True)
    model_bundle = {
        "pipeline": rf_pipeline,
        "threshold": best_thresh,
        "feature_columns": list(X.columns)
    }
    joblib.dump(model_bundle, os.path.join("models", "rf_attrition_model.joblib"))
    print("Model berhasil disimpan ke models/rf_attrition_model.joblib")

if __name__ == "__main__":
    main()
