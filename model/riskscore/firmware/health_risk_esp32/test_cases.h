// 10 Sample Test Cases generated from WESAD Test Set
// Format: {HR, SpO2, Temp, Height, Weight, BMI, Expected_Risk_Score, Expected_Label}

#ifndef TEST_CASES_H
#define TEST_CASES_H

struct TestCase {
  float hr;
  float spo2;
  float temp;
  float height;
  float weight;
  float bmi;
  float expected_risk;
  int expected_label;
};

const int NUM_TEST_CASES = 10;
const TestCase TEST_CASES[NUM_TEST_CASES] = {
  // Test #1 (Target: Safe, Expected Risk: 0.0000)
  {75.0f, 99.0f, 37.12f, 170.0f, 60.0f, 20.76f, 0.0000f, 0},
  // Test #2 (Target: Safe, Expected Risk: 0.0000)
  {60.0f, 98.7f, 36.4f, 164.0f, 56.0f, 20.82f, 0.0000f, 0},
  // Test #3 (Target: Elevated Risk, Expected Risk: 0.9961)
  {172.5f, 96.3f, 36.65f, 180.0f, 70.0f, 21.6f, 0.9961f, 1},
  // Test #4 (Target: Elevated Risk, Expected Risk: 0.9961)
  {127.5f, 97.3f, 36.72f, 180.0f, 70.0f, 21.6f, 0.9961f, 1},
  // Test #5 (Target: Safe, Expected Risk: 0.0000)
  {67.5f, 98.6f, 36.92f, 168.0f, 58.0f, 20.55f, 0.0000f, 0},
  // Test #6 (Target: Safe, Expected Risk: 0.0000)
  {82.5f, 98.2f, 37.11f, 168.0f, 58.0f, 20.55f, 0.0000f, 0},
  // Test #7 (Target: Safe, Expected Risk: 0.0000)
  {67.5f, 98.8f, 36.32f, 179.0f, 70.0f, 21.85f, 0.0000f, 0},
  // Test #8 (Target: Elevated Risk, Expected Risk: 0.9961)
  {45.0f, 98.7f, 36.66f, 195.0f, 105.0f, 27.61f, 0.9961f, 1},
  // Test #9 (Target: Safe, Expected Risk: 0.0000)
  {75.0f, 98.5f, 36.33f, 164.0f, 56.0f, 20.82f, 0.0000f, 0},
  // Test #10 (Target: Safe, Expected Risk: 0.0000)
  {90.0f, 97.7f, 36.4f, 168.0f, 57.0f, 20.2f, 0.0000f, 0}
};

#endif // TEST_CASES_H
