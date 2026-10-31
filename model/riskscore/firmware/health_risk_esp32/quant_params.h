// Quantization parameters (INT8) for Seeed XIAO ESP32-S3
// Generated automatically from export_int8.py
// Formulas:
//   q_in  = (int8_t) constrain(round(x_norm / INPUT_SCALE) + INPUT_ZERO_POINT, -128, 127)
//   risk  = (float)(q_out - OUTPUT_ZERO_POINT) * OUTPUT_SCALE

#ifndef QUANT_PARAMS_H
#define QUANT_PARAMS_H

#define INPUT_SCALE        0.026725f
#define INPUT_ZERO_POINT   3
#define OUTPUT_SCALE       0.003906f
#define OUTPUT_ZERO_POINT  -128

#endif // QUANT_PARAMS_H
