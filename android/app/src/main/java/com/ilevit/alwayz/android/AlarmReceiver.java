package com.ilevit.alwayz.android;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.text.format.DateFormat;

import java.util.Calendar;
import java.util.Locale;

public class AlarmReceiver extends BroadcastReceiver {
    private static final String STEP_COUNT_PREFERENCE_KEY = "step-count";
    private static final String LAST_UPDATED_AT_KEY = "last-updated-at";
    private static final String CORRECTION_KEY = "correction";
    private static final String DATE_FORMAT = "yyyy-MM-dd";

    private SharedPreferences preferences;

    @Override
    public void onReceive(Context context, Intent intent) {
        preferences = context.getSharedPreferences(STEP_COUNT_PREFERENCE_KEY, Context.MODE_PRIVATE);
        String currentDateString = getDate(Calendar.getInstance(Locale.KOREA).getTimeInMillis());
        String lastUpdatedDate = getStepCount(LAST_UPDATED_AT_KEY) == null ? currentDateString : getStepCount(LAST_UPDATED_AT_KEY);
        int correction = getStepCount(CORRECTION_KEY) == null ? 0 : Integer.parseInt(getStepCount(CORRECTION_KEY));
        int lastStepCount = getStepCount(lastUpdatedDate) == null ? 0 : Integer.parseInt(getStepCount(lastUpdatedDate));
        lastStepCount += correction;
        int todayStepCount = 0;

        if(!lastUpdatedDate.equals(currentDateString)) { 
            SharedPreferences.Editor editor = preferences.edit();
            editor.putString(CORRECTION_KEY, String.valueOf(lastStepCount));
            editor.putString(LAST_UPDATED_AT_KEY, currentDateString);
            editor.putString(currentDateString, String.valueOf(todayStepCount));
            editor.apply();
        } 
    }

    private String getDate(long timeInMillis) {
        Calendar cal = Calendar.getInstance(Locale.KOREA);
        cal.setTimeInMillis(timeInMillis);
        return DateFormat.format(DATE_FORMAT, cal).toString();
    }

    public String getStepCount(String key) {
        return preferences.getString(key, null);
    }
}
