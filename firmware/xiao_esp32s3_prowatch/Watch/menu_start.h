#pragma once

#include "start.h"
#include "gifwalk.h"

extern Arduino_GFX *gfx;

extern int HH,MIN,SEC;
extern int DAY,MON,YEAR;
extern int spo2;
extern int bpm;

#define GREEN 0x07E0
#define BLACK 0x0000


// ===== GIF =====
const unsigned char* walkFrames[] =
{
epd_bitmap_icon_luck_7,
epd_bitmap_icon_luck_8,
epd_bitmap_icon_luck_9,
epd_bitmap_icon_luck_10,
epd_bitmap_icon_luck_11,
epd_bitmap_icon_luck_12,
epd_bitmap_icon_luck_13
};

int start_frame=0;

int lastHH=-1;
int lastMM=-1;
int lastDAY=-1;
int lastMON=-1;
int lastYEAR=-1;
int lastBPM=-1;
int lastSPO2=-1;

bool startForceRedraw=true;

uint32_t start_anim=0;


// ================= SPO2 =================
void start_draw_SPO2()
{
  // clear bar
  gfx->fillRect(130,45,95,12,BLACK);

  // frame
  gfx->drawRect(130,45,95,12,GREEN);

  // scale 0-100
  int w = map(spo2,0,100,0,93);

  if(w<0) w=0;
  if(w>93) w=93;

  // fill
  gfx->fillRect(131,46,w,10,GREEN);

  // clear text
  gfx->fillRect(130,60,95,15,BLACK);

  gfx->setFont(&Orbitron_Bold_10);
  gfx->setTextColor(GREEN);
  gfx->setCursor(130,70);
  gfx->printf("SPO2: %02d%%",spo2);
}


// ================= STATIC =================
void start_draw_static()
{
  gfx->drawBitmap(0,0,epd_bitmap_start,240,240,GREEN);

  start_draw_SPO2();

  startForceRedraw = true;
}


// ================= HH =================
void start_draw_HH()
{
  gfx->fillRect(8,42,90,60,BLACK);

  gfx->setFont(&Open_Sans_Hebrew_Bold_80);
  gfx->setTextColor(GREEN);

  gfx->setCursor(6,102);
  gfx->printf("%02d",HH);
}


// ================= MM =================
void start_draw_MM()
{
  gfx->fillRect(8,124,90,60,BLACK);

  gfx->setFont(&Open_Sans_Hebrew_Bold_80);
  gfx->setTextColor(GREEN);

  gfx->setCursor(6,182);
  gfx->printf("%02d",MIN);
}


// ================= DATE =================
void start_draw_DATE()
{
  gfx->fillRect(8,208,104,20,BLACK);

  gfx->setFont(&Orbitron_Bold_14);
  gfx->setTextColor(GREEN);

  gfx->setCursor(7,222);
  gfx->printf("%02d.%02d.20%02d",DAY,MON,YEAR);
}


// ================= HP (Cố định hằng số HP 100 theo thiết kế) =================
void start_draw_HP()
{
  gfx->fillRect(137,207,86,20,BLACK);

  gfx->setFont(&Orbitron_Bold_16);
  gfx->setTextColor(GREEN);

  gfx->setCursor(140,222);
  gfx->printf("HP 100");
}


// ================= VAULT =================
void start_draw_vault()
{
  gfx->drawBitmap(
    145,
    78,
    walkFrames[start_frame],
    80,
    120,
    GREEN,
    BLACK
  );

  start_frame++;
  if(start_frame>=7) start_frame=0;
}


// ================= UPDATE =================
void start_update()
{
  // force redraw khi vào menu
  if(startForceRedraw)
  {
    start_draw_HH();
    start_draw_MM();
    start_draw_DATE();
    start_draw_HP();
    start_draw_SPO2();

    lastHH=HH;
    lastMM=MIN;
    lastDAY=DAY;
    lastMON=MON;
    lastYEAR=YEAR;
    lastBPM=bpm;
    lastSPO2=spo2;

    startForceRedraw=false;
  }

  // animation
  if(millis()-start_anim>140)
  {
    start_anim=millis();
    start_draw_vault();
  }

  // update HH
  if(HH!=lastHH)
  {
    lastHH=HH;
    start_draw_HH();
  }

  // update MM
  if(MIN!=lastMM)
  {
    lastMM=MIN;
    start_draw_MM();
  }

  // update DATE
  if(DAY!=lastDAY || MON!=lastMON || YEAR!=lastYEAR)
  {
    lastDAY=DAY;
    lastMON=MON;
    lastYEAR=YEAR;

    start_draw_DATE();
  }

  // HP là hằng số cố định HP 100, không cập nhật theo nhịp tim BPM
  lastBPM = bpm;

  // update SPO2
  if(spo2!=lastSPO2)
  {
    lastSPO2=spo2;
    start_draw_SPO2();
  }
}