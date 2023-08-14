package com.ilevit.alwayz.android;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import android.os.Build;

import android.app.AlarmManager;
import android.app.PendingIntent;

import android.content.Context;
import android.content.Intent;

import java.util.Calendar;

public class PedometerUtilModule extends ReactContextBaseJavaModule {
    private Context context;

    public PedometerUtilModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.context = reactContext;
    }

    @Override
    public String getName() {
        return "PedometerUtil";
    }

    @ReactMethod
    public void startAlarmManager() {
        // Alarm Manager 인스턴스 생성
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
    
        // 작업을 실행할 시간 설정 (매일 오전 0시)
    Calendar calendar = Calendar.getInstance();
    calendar.setTimeInMillis(System.currentTimeMillis());
    calendar.set(Calendar.HOUR_OF_DAY, 0);
    calendar.set(Calendar.MINUTE, 0);
    calendar.set(Calendar.SECOND, 0);

    // 이미 지난 시간이라면 다음날 동일 시간으로 변경
    if (calendar.getTimeInMillis() < System.currentTimeMillis()) {
        calendar.add(Calendar.DAY_OF_YEAR, 1);
    }
    
        // AlarmReceiver를 호출할 PendingIntent 생성
        Intent intent = new Intent(context, AlarmReceiver.class);
        
        // PendingIntent에 FLAG_IMMUTABLE 설정 추가
        PendingIntent pendingIntent = PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    
        // Alarm Manager에 작업 등록
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            AlarmManager.AlarmClockInfo alarmClockInfo = new AlarmManager.AlarmClockInfo(calendar.getTimeInMillis(), null);
            alarmManager.setAlarmClock(alarmClockInfo, pendingIntent);
        } else {
            alarmManager.set(AlarmManager.RTC_WAKEUP, calendar.getTimeInMillis(), pendingIntent);
        }
        
    }
    
    @ReactMethod
    public void cancelAlarm() {
        Intent intent = new Intent(context, AlarmReceiver.class);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_NO_CREATE);
    
        if (pendingIntent != null) {
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            alarmManager.cancel(pendingIntent);
            pendingIntent.cancel();
        }
    
        // 이미 지난 시간에 대한 알람도 삭제
        Intent oldIntent = new Intent(context, AlarmReceiver.class);
        PendingIntent oldPendingIntent = PendingIntent.getBroadcast(context, 0, oldIntent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_NO_CREATE);
        if (oldPendingIntent != null) {
            AlarmManager oldAlarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            oldAlarmManager.cancel(oldPendingIntent);
            oldPendingIntent.cancel();
        }
    }
    

    
}
