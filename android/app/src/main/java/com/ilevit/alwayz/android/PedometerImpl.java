package com.ilevit.alwayz.android;

import static android.content.Context.MODE_PRIVATE;

import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.SystemClock;
import android.content.Context;
import android.text.format.DateFormat;
import android.content.SharedPreferences;
import android.preference.PreferenceManager;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.GregorianCalendar;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.text.SimpleDateFormat;

public class PedometerImpl implements SensorEventListener { // 센서 이벤트 리스너를 구현해야 함, 걸음수를 측정하는 가장 중요한 자바 클래스
    private SensorManager sensorManager; // 센서 매니저
    private Sensor stepCounter; // 센서의 종류: 걸음수 센서
    private ReactApplicationContext reactContext; // 리액트 네이티브 앱의 컨텍스트

    private static final String STEP_COUNT_PREFERENCE_KEY = "step-count"; // 걸음수를 저장하는 Shared Preference의 키
    private static final String LAST_UPDATED_AT_KEY = "last-updated-at"; // 마지막으로 업데이트된 날짜를 저장하는 Shared Preference의 키
    private static final String CORRECTION_KEY = "correction";  // 걸음수 보정값을 저장하는 Shared Preference의 키
    private static final String DATE_FORMAT = "yyyy-MM-dd"; // 날짜 포맷


    private String lastUpdatedDate;
    private int correction = 0;
    private boolean listening = false;
    private String listeningFromDate;
    private int listeningFromValue = 0;
    private int initialStepCount = -1;

    public PedometerImpl(ReactApplicationContext reactContext) {
        sensorManager = (SensorManager) reactContext.getSystemService(reactContext.SENSOR_SERVICE);
        stepCounter = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
        this.reactContext = reactContext;
        String currentDateString = getDate(Calendar.getInstance(Locale.KOREA).getTimeInMillis());
        this.lastUpdatedDate = getStepCount(LAST_UPDATED_AT_KEY) == null ? currentDateString : getStepCount(LAST_UPDATED_AT_KEY);
        String todayStepCount = getStepCount(currentDateString);
        String queriedCorrection = getStepCount(CORRECTION_KEY);
        this.correction = (queriedCorrection == null ? (todayStepCount == null ? 0 : -Integer.parseInt(todayStepCount)) : Integer.parseInt(queriedCorrection));
    }

    public void start() {
        if ((stepCounter = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)) != null) {
            sensorManager.unregisterListener(this); // 앱 껐다 켰을때를 고려해서...?
            this.listeningFromValue = 0;
            this.listeningFromDate = null;
            this.listening = false;
            sensorManager.registerListener(this, this.stepCounter, SensorManager.SENSOR_DELAY_FASTEST);
        }
    }

    public void start(long date) { // 실시간 걸음수 감지를 시작하라고 명령하는 메소드
        if ((stepCounter = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)) != null) {
            sensorManager.unregisterListener(this); // 앱 껐다 켰을때를 고려해서...?
            Calendar cal = Calendar.getInstance(Locale.KOREA);
            cal.add(Calendar.DAY_OF_YEAR,0);//전날 걸음수를 합치던 것을 변경, 오늘 걸음수만을 합치도록 변경
            List<Date> list = getDatesBetweenUsingJava7(dateFromTimestamp(date), cal.getTime());

            Iterator<Date> it = list.iterator();
        
            int sum = this.listeningFromValue; // 전날 걸음수를 합치던 것을 변경, 오늘 걸음수만을 합치도록 변경
        
            while (it.hasNext()) {
                String queryResult = getStepCount(getDate(it.next().getTime()));
                int count = queryResult == null ? 0 : Integer.parseInt(queryResult);
                sum += count;
            }
            this.listeningFromValue = sum;
            this.listeningFromDate = getDate(dateFromTimestamp(date).getTime());
            this.listening = sensorManager.registerListener(this, this.stepCounter, SensorManager.SENSOR_DELAY_FASTEST);
        }
    }
    
    public void stop() {
        if (this.listening) {
            int currentStepCount = getStepCount(this.lastUpdatedDate) == null ? 0 : Integer.parseInt(getStepCount(this.lastUpdatedDate));
            setStepCount(this.lastUpdatedDate, String.valueOf(currentStepCount));  // 마지막으로 업데이트된 걸음수 값을 저장
            sensorManager.unregisterListener(this);
            this.listening = false;
            this.listeningFromValue = 0;
            this.listeningFromDate = null;
        }
    }


    @Override
    public void onSensorChanged(SensorEvent event) { // Shared Preference에 저장된 걸음수를 업데이트하는 메소드, 걸음수 센서가 측정한 값을 받아서 처리
        if (event.sensor.getType() != Sensor.TYPE_STEP_COUNTER) return;

        int currentStepCount = (int) event.values[0]; // 기기가 부팅된 이후 측정된 총 걸음수
        String currentDate = getDate(getTimestampFromBootTimeStamp(event.timestamp));

        if(currentStepCount < this.correction){
            setStepCount(CORRECTION_KEY, "0");
            this.correction = 0;
        }

        if (getStepCount(LAST_UPDATED_AT_KEY)==null) { // 처음 실행될 때만 값을 초기화: 걸음수 센서는 측정 시작후 모든 걸음수를 측정해서, 앱을 껐다 켰을때 초기값을 0으로 초기화
            this.initialStepCount = (int) event.values[0]; 
            this.correction = initialStepCount;
            setStepCount(CORRECTION_KEY, String.valueOf(correction));
            setStepCount(LAST_UPDATED_AT_KEY, currentDate);
        }

        if (!currentDate.equals(this.lastUpdatedDate)) { // 센서에 이벤트가 발생했는데, 날짜가 바뀐 상태이면 보정값을 새로운 날짜로 업데이트
            this.lastUpdatedDate = currentDate;
            setStepCount(LAST_UPDATED_AT_KEY, currentDate);
            this.correction = currentStepCount;
            setStepCount(CORRECTION_KEY, String.valueOf(currentStepCount));
            Calendar cal = Calendar.getInstance(Locale.KOREA);
            cal.add(Calendar.DAY_OF_YEAR, -8); // 8일 전 데이터 삭제, Shared Preference에 저장되는 데이터가 많아지면 성능에 영향을 줄 수 있음
            String dateToDelete = getDate(cal.getTimeInMillis());
            setStepCount(dateToDelete, null);
        }

        int todayStepCount = currentStepCount - this.correction;
        setStepCount(currentDate, String.valueOf(todayStepCount));
        Calendar cal = Calendar.getInstance(Locale.KOREA);
        cal.add(Calendar.DAY_OF_YEAR, -8);
        String dateToDelete = getDate(cal.getTimeInMillis());
        if (getStepCount (dateToDelete) != null){
            setStepCount(dateToDelete, null); // 8일 전 데이터 삭제, Shared Preference에 저장되는 데이터가 많아지면 성능에 영향을 줄 수 있음
        }
    

        if (listening && reactContext.hasActiveCatalystInstance()) {
            WritableMap params = Arguments.createMap();
            params.putString("startDate", this.listeningFromDate);
            params.putString("endDate", currentDate);
            params.putInt("numberOfSteps", todayStepCount);
            params.putString("date", currentDate);
            reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit("stepCountChanged", params);
        }
    }


    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {

    }

    public void queryPedometerDataFromDate(Long from, Long end, Callback callback) {
        try {
            Date startDate = dateFromTimestamp(from);
            Date endDate = dateFromTimestamp(end);
            List<Date> list = getDatesBetweenUsingJava7(startDate, endDate);

            Iterator<Date> it = list.iterator();
            int sum = 0;

            while (it.hasNext()) {
                String queryResult = getStepCount(getDate(it.next().getTime()));
                int count = queryResult == null ? 0 : Integer.parseInt(queryResult);
                sum += count;
            }


            WritableMap result = Arguments.createMap();

            result.putString("startDate", getDate(startDate.getTime()));
            result.putString("endDate", getDate(endDate.getTime()));
            result.putString( "date", getDate(endDate.getTime())); 
            result.putInt("numberOfSteps", sum);
            callback.invoke(null, result);

        } catch (Exception e) {
            callback.invoke(e);
        }

    }

    public String getStepCount(String key) {
        return reactContext.getSharedPreferences(STEP_COUNT_PREFERENCE_KEY, MODE_PRIVATE).getString(key, null);
    }

    public void setStepCount(String key, String value) {
        SharedPreferences preferences = reactContext.getSharedPreferences(STEP_COUNT_PREFERENCE_KEY, MODE_PRIVATE);
        SharedPreferences.Editor editor = preferences.edit();
        editor.putString(key, value);
        editor.apply();
    }

    private String getDate(long time) {
        String date = DateFormat.format(DATE_FORMAT, dateFromTimestamp(time)).toString();
        return date;
    }

    private long getTimestampFromBootTimeStamp(long bootTimeStamp) {
        return System.currentTimeMillis() + ((bootTimeStamp - SystemClock.elapsedRealtimeNanos()) / 1000000L);
    }

    private static List getDatesBetweenUsingJava7(Date startDate, Date endDate) {
        List datesInRange = new ArrayList<>();
        Calendar calendar = getCalendarWithoutTime(startDate);
        Calendar endCalendar = getCalendarWithoutTime(endDate);
        endCalendar.add(Calendar.DAY_OF_YEAR, 1);
        while (calendar.before(endCalendar)) {
            Date result = calendar.getTime();
            datesInRange.add(result);
            calendar.add(Calendar.DATE, 1);
        }

        return datesInRange;
    }

    private static Calendar getCalendarWithoutTime(Date date) {
        Calendar calendar = new GregorianCalendar(Locale.KOREA);
        calendar.setTime(date);
        calendar.set(Calendar.HOUR, 0);
        calendar.set(Calendar.HOUR_OF_DAY, 0);
        calendar.set(Calendar.MINUTE, 0);
        calendar.set(Calendar.SECOND, 0);
        calendar.set(Calendar.MILLISECOND, 0);
        return calendar;
    }

    private Date dateFromTimestamp(long timestamp) {
        Calendar cal = Calendar.getInstance(Locale.KOREA);
        cal.setTimeInMillis(timestamp);
        return cal.getTime();
    }
}

