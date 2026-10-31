#pragma once

#include "data.h"
#include "set.h"
#include "TRI.h"

extern Arduino_GFX *gfx;

extern int HH;
extern int MIN;
extern int SEC;

extern int DAY;
extern int MON;
extern int YEAR;

extern int currentMenu;

extern bool t0,t1,t2;
extern bool lastT0,lastT1,lastT2;

#define GREEN 0x07E0
#define BLACK 0x0000


// ================= STATE =================
int cursor=6;
bool editMode=false;
int editIndex=0;


// ================= CURSOR POS =================
int posX[8]={32,32,32,145,145,145,12,170};
int posY[8]={54,94,135,54,94,135,188,188};


// ================= VALUE POSITION =================
#define HH_X   43
#define HH_Y   85

#define MIN_X  43
#define MIN_Y  126

#define SEC_X  43
#define SEC_Y  168

#define DAY_X  155
#define DAY_Y  85

#define MON_X  155
#define MON_Y  126

#define YEAR_X 155
#define YEAR_Y 168


int triX,triY;


// ================= LEAP =================
bool data_isLeap(int y)
{
  int year = 2000 + y;
  return ((year%4==0 && year%100!=0) || year%400==0);
}


// ================= DAYS =================
int data_daysInMonth(int m,int y)
{
  switch(m)
  {
    case 1: return 31;
    case 2: return data_isLeap(y)?29:28;
    case 3: return 31;
    case 4: return 30;
    case 5: return 31;
    case 6: return 30;
    case 7: return 31;
    case 8: return 31;
    case 9: return 30;
    case 10:return 31;
    case 11:return 30;
    case 12:return 31;
  }
  return 31;
}


// ================= DRAW VALUE =================
void data_draw_value(int x,int y,int v,uint16_t color)
{
  gfx->setFont(&Open_Sans_Hebrew_Bold_30);
  gfx->setTextColor(color);
  gfx->setCursor(x,y);
  gfx->printf("%02d",v);
}


void data_draw_all()
{
  data_draw_value(HH_X,HH_Y,HH,GREEN);
  data_draw_value(MIN_X,MIN_Y,MIN,GREEN);
  data_draw_value(SEC_X,SEC_Y,SEC,GREEN);

  data_draw_value(DAY_X,DAY_Y,DAY,GREEN);
  data_draw_value(MON_X,MON_Y,MON,GREEN);
  data_draw_value(YEAR_X,YEAR_Y,YEAR,GREEN);
}


// ================= CURSOR =================
void data_erase_cursor(int c)
{
  gfx->drawBitmap(posX[c],posY[c],epd_bitmap_ST,64,44,BLACK);
}

void data_draw_cursor(int c)
{
  gfx->drawBitmap(posX[c],posY[c],epd_bitmap_ST,64,44,GREEN);
}

void data_move_cursor(int newC)
{
  data_erase_cursor(cursor);
  cursor=newC;
  data_draw_cursor(cursor);
}


// ================= TRI =================
void data_erase_tri()
{
  gfx->drawBitmap(triX,triY,epd_bitmap_TRI,112,28,BLACK);
  gfx->drawBitmap(triX,triY,epd_bitmap_TRIL,112,28,BLACK);
  gfx->drawBitmap(triX,triY,epd_bitmap_TRIR,112,28,BLACK);
}

void data_draw_tri(const unsigned char* bmp)
{
  triX = posX[editIndex]-24;
  triY = posY[editIndex]+8;
  gfx->drawBitmap(triX,triY,bmp,112,28,GREEN);
}


// ================= CHANGE VALUE =================
void data_change(int d)
{
  switch(editIndex)
  {
    case 0:
      data_draw_value(HH_X,HH_Y,HH,BLACK);
      HH+=d;
      if(HH>23)HH=0; if(HH<0)HH=23;
      data_draw_value(HH_X,HH_Y,HH,GREEN);
    break;

    case 1:
      data_draw_value(MIN_X,MIN_Y,MIN,BLACK);
      MIN+=d;
      if(MIN>59)MIN=0; if(MIN<0)MIN=59;
      data_draw_value(MIN_X,MIN_Y,MIN,GREEN);
    break;

    case 2:
      data_draw_value(SEC_X,SEC_Y,SEC,BLACK);
      SEC+=d;
      if(SEC>59)SEC=0; if(SEC<0)SEC=59;
      data_draw_value(SEC_X,SEC_Y,SEC,GREEN);
    break;

    case 3:
    {
      data_draw_value(DAY_X,DAY_Y,DAY,BLACK);
      DAY+=d;

      int maxDay = data_daysInMonth(MON,YEAR);

      if(DAY>maxDay) DAY=1;
      if(DAY<1) DAY=maxDay;

      data_draw_value(DAY_X,DAY_Y,DAY,GREEN);
    }
    break;

    case 4:
      data_draw_value(MON_X,MON_Y,MON,BLACK);
      MON+=d;
      if(MON>12)MON=1;
      if(MON<1)MON=12;
      data_draw_value(MON_X,MON_Y,MON,GREEN);
    break;

    case 5:
      data_draw_value(YEAR_X,YEAR_Y,YEAR,BLACK);
      YEAR+=d;
      if(YEAR>99)YEAR=0;
      if(YEAR<0)YEAR=99;
      data_draw_value(YEAR_X,YEAR_Y,YEAR,GREEN);
    break;
  }
}


// ================= STATIC =================
void data_draw_static()
{
  editMode = false;
  cursor = 6;
  gfx->drawBitmap(0,0,epd_bitmap_DATA,240,240,GREEN);
  data_draw_all();
  data_draw_cursor(cursor);
}


// ================= UPDATE =================
void data_update()
{
  if(editMode)
  {
    if(t0 && !lastT0)
    {
      data_erase_tri();
      data_change(-1);
      data_draw_tri(epd_bitmap_TRIL);
    }

    if(t2 && !lastT2)
    {
      data_erase_tri();
      data_change(1);
      data_draw_tri(epd_bitmap_TRIR);
    }

    if(!t0 && !t2 && (lastT0 || lastT2))
    {
      data_erase_tri();
      data_draw_tri(epd_bitmap_TRI);
    }
  }

  if(t1 && !lastT1)
  {
    if(editMode)
    {
      data_erase_tri();
      editIndex++;

      if(editIndex>5)
      {
        editMode=false;
        cursor=6;
        data_draw_cursor(cursor);
      }
      else
      {
        data_draw_tri(epd_bitmap_TRI);
      }
    }
    else
    {
      data_erase_cursor(cursor);
      editMode=true;
      editIndex=0;
      data_draw_tri(epd_bitmap_TRI);
    }
  }
}