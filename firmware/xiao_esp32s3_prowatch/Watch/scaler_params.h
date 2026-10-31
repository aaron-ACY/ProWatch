// Normalization parameters (Z-Score) for ESP32-S3
// Formula: x_norm = (x_raw - mean) / scale
#ifndef SCALER_PARAMS_H
#define SCALER_PARAMS_H

const float SCALER_MEAN[6] = {89.0747f, 98.2665f, 36.7057f, 174.7688f, 68.3514f, 22.1842f};
const float SCALER_SCALE[6] = {22.9967f, 0.5028f, 0.3003f, 8.7674f, 12.1926f, 1.7255f};

#endif // SCALER_PARAMS_H
