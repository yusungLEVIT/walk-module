package com.ilevit.alwayz.android;

import com.ilevit.alwayz.android.PedometerImpl;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;

import android.telecom.Call;
import android.util.Log;

import android.hardware.SensorManager;
import android.hardware.Sensor;
import android.hardware.SensorEventListener;
import android.hardware.SensorEvent;

import static android.content.Context.SENSOR_SERVICE;
public class RNReactNativeDailyStepCounterModule extends ReactContextBaseJavaModule {
    private PedometerImpl pedometer;
    private ReactApplicationContext reactContext;

    public RNReactNativeDailyStepCounterModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
        this.pedometer = new PedometerImpl(context);
    }


    public String getName() {
        return "RNReactNativeDailyStepCounter";
    }

    @ReactMethod
    public void startPedometerUpdatesFromDate(Double date) {
      if (date != null) {
            this.pedometer.start(date.longValue());
        } else {
            this.pedometer.start();
        }
    }
  
    @ReactMethod
    public void stopPedometerUpdates() {
        this.pedometer.stop();
    }
    
    @ReactMethod
    public void queryPedometerDataBetweenDates(Double from, Double to, Callback callback) {
        this.pedometer.queryPedometerDataFromDate(from.longValue(), to.longValue(), callback);
    }

    @ReactMethod
    public void isStepCounterAvailable(Promise promise) {
        SensorManager sensorManager = (SensorManager) reactContext.getSystemService(SENSOR_SERVICE);
        Sensor stepCounterSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);

        promise.resolve(stepCounterSensor != null);
    }
}