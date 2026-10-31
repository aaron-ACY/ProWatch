#pragma once

#include "heart.h"
#include "giftim.h"
#include "gifstrong.h"

extern Arduino_GFX *gfx;
extern const GFXfont Orbitron_Bold_16 PROGMEM;

extern int bpm;
extern int spo2;
extern bool hasSpo2;
extern int HH,MIN,SEC;
extern bool isWatchMeasuring();

#define GREEN 0x07E0
#define BLACK 0x0000


const unsigned char* heartFrames[] =
{
epd_bitmap_tim1,
epd_bitmap_tim2
};

const unsigned char* strongFrames[] =
{
epd_bitmap_icon_strength_3,
epd_bitmap_icon_strength_4,
epd_bitmap_icon_strength_5,
epd_bitmap_icon_strength_6
};

int heartFrame=0;
int strongFrame=0;

int bpmGraph[6]={68, 82, 74, 90, 76, 84};
int graphWaveStep=0;
bool lastMeasuringGraphState=false;

uint32_t tHeart=0;
uint32_t tStrong=0;
uint32_t tGraph=0;

// Forward declarations
void heart_draw_heart();
void heart_draw_bpm();
void heart_draw_time();
void heart_draw_spo2();
void heart_draw_strong();
void heart_draw_graph();
void heart_lock_final_graph();

// ================= STATIC =================
void heart_draw_static()
{
  gfx->drawBitmap(0,0,epd_bitmap_HEART,240,240,GREEN);

  // Vẽ tức thì các thành phần không phải chờ timer
  heart_draw_heart();
  heart_draw_bpm();
  heart_draw_time();
  heart_draw_spo2();
  heart_draw_strong();
  heart_draw_graph();

  tHeart = millis();
  tStrong = millis();
  tGraph = millis();
}


// ================= HEART =================
void heart_draw_heart()
{
  gfx->fillRect(23,45,60,60,BLACK);

  gfx->drawBitmap(
    23,48,
    heartFrames[heartFrame],
    60,60,
    GREEN
  );

  heartFrame++;
  if(heartFrame>=2) heartFrame=0;
}


// ================= STRONG =================
void heart_draw_strong()
{
  gfx->drawBitmap(
    135,78,
    strongFrames[strongFrame],
    80,120,
    GREEN,BLACK
  );

  strongFrame++;
  if(strongFrame>=4) strongFrame=0;
}


// ================= BPM =================
void heart_draw_bpm()
{
  // Xóa sạch vùng text số BPM tránh bóng mờ/lỗi hiển thị ký tự cũ
  gfx->fillRect(20,115,75,21,BLACK);

  gfx->setFont(&Orbitron_Bold_16);
  gfx->setTextColor(GREEN);
  gfx->setCursor(21,130);
  if (bpm > 0) {
    gfx->printf("%03d/m", bpm);
  } else {
    gfx->printf("---/m");
  }
}


// ================= TIME =================
void heart_draw_time()
{
  gfx->fillRect(138,41,86,20,BLACK);

  gfx->setFont(&Orbitron_Bold_16);
  gfx->setTextColor(GREEN);
  gfx->setCursor(140,55);
  gfx->printf("%02d:%02d:%02d",HH,MIN,SEC);
}


// ================= SPO2 (KHÔNG PHẢI HP) =================
void heart_draw_spo2()
{
  gfx->fillRect(138,206,85,20,BLACK);

  gfx->setFont(&Orbitron_Bold_16);
  gfx->setTextColor(GREEN);
  gfx->setCursor(140,222);
  if (spo2 > 0) {
    gfx->printf("O2 %02d%%", spo2);
  } else {
    gfx->printf("O2 --%%");
  }
}


// ================= GRAPH =================
void heart_lock_final_graph()
{
  int center = (bpm >= 45 && bpm <= 135) ? bpm : 76;
  const int offsets[6] = {-8, +6, -4, +12, -2, +4};
  for (int i = 0; i < 6; i++) {
    bpmGraph[i] = constrain(center + offsets[i], 45, 135);
  }
}

void heart_draw_graph()
{
  gfx->fillRect(12,160,110,50,BLACK);

  for(int i=0;i<6;i++)
  {
    int val = bpmGraph[i];
    if (val < 40) val = 40;
    if (val > 140) val = 140;
    int h = map(val, 40, 140, 5, 45);
    if (h < 5) h = 5;
    if (h > 45) h = 45;

    gfx->fillRect(
      14 + i*13,
      210-h,
      8,
      h,
      GREEN
    );
  }
}


// ================= UPDATE =================
void heart_update()
{
  bool measuring = isWatchMeasuring();

  // Khi vừa kết thúc đo (measuring chuyển từ true -> false): khóa biểu đồ đứng yên ở kết quả cuối
  if (lastMeasuringGraphState && !measuring)
  {
    heart_lock_final_graph();
    heart_draw_bpm();
    heart_draw_spo2();
    heart_draw_graph();
  }
  lastMeasuringGraphState = measuring;

  if(millis()-tHeart>400)
  {
    tHeart=millis();
    if (measuring) {
      heart_draw_heart();
    }
    heart_draw_bpm();
    heart_draw_time();
    heart_draw_spo2();
  }

  if(measuring && millis()-tStrong>350)
  {
    tStrong=millis();
    heart_draw_strong();
  }

  // Biểu đồ cột nhảy lên xuống nhịp nhàng vừa phải (850ms - chậm hơn để mượt mà) khi ĐANG ĐO, và DỪNG LẠI khi kết thúc đo
  if(measuring && millis()-tGraph>850)
  {
    tGraph=millis();
    graphWaveStep = (graphWaveStep + 1) % 12;
    const int wavePattern[12] = {52, 95, 68, 128, 60, 110, 74, 134, 58, 102, 80, 120};
    for(int i=0;i<6;i++)
    {
      int idx = (graphWaveStep + i * 2) % 12;
      int jitter = ((int)(millis() >> 5) + i * 3) % 5 - 2;  // jitter giảm từ ±5 xuống ±2
      bpmGraph[i] = constrain(wavePattern[idx] + jitter, 45, 138);
    }
    heart_draw_graph();
  }
}