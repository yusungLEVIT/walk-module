import React, { useState, useEffect, useRef } from "react";
import WebView from "react-native-webview";
import AuthStore from "./src/stores/AuthStore";
import configs from "./src/utils/configs";
import backendApis from "./src/utils/backendApis";
import {
  Alert,
  View,
  AppState,
  BackHandler,
  Platform,
  NativeModules,
  Vibration,
  SafeAreaView,
} from "react-native";
import BackgroundService from "react-native-background-actions";
import StepCounter from "./src/utils/StepCounter";
import AsyncStorage from "@react-native-async-storage/async-storage";
import UserStore from "./src/stores/UserStore";
import VersionCheck from "react-native-version-check";

// 백그라운드 서비스 옵션
const manbogiBackgroundServiceOptions = {
  taskName: "AlluluManbogiTask",
  taskTitle: "올웨이즈 올룰루",
  taskDesc: "걸음 수 측정 중...",
  taskIcon: {
    name: "ic_launcher_round",
    type: "mipmap",
  },
  color: "#ff00ff",
  linkingURI: "alwayz://appLink/?shareType=Manbogi",
  parameters: {
    delay: 1000,
  },
};

const AlluluScreen = ({ navigation }) => {
  const webViewRef = useRef();
  const appState = useRef(AppState.currentState);
  const throttleRef = useRef();
  const stepCount = useRef(0);
  const [streaming, setStreaming] = useState(false);
  const PedometerUtilModule = NativeModules.PedometerUtil; // Android PedometerUtil
  const ScheduleExactAlarm = NativeModules.ScheduleExactAlarm; // Android ScheduleExactAlarm Permission
  const [currentDate, setCurrentDate] = useState(null);
  const [randomString, setRandomString] = useState(
    Math.random().toString(36).substr(2, 8)
  );
  // 현재 날짜 가져오는 함수
  const getCurrentDate = async () => {
    if (currentDate) {
      return currentDate;
    }
    const date = await backendApis.getNowDate();
    setCurrentDate(date);
    return date;
  };

  const getStepLogJson = async () => {
    const currentDate = await getCurrentDate();
    const today = new Date(currentDate?.data);

    today.setDate(today.getDate() - 1); // 하루 전
    today.setHours(0, 0, 0, 0);
    const start = new Date(today.getTime());

    start.setDate(start.getDate() - 2); // 3일 이전
    start.setHours(0, 0, 0, 0);

    const stepLog = [];

    try {
      // 3일 간격으로 각 날짜별 걸음수를 쿼리
      for (let date = start; date <= today; date.setDate(date.getDate() + 1)) {
        const startDate = new Date(date.getTime());
        startDate.setDate(startDate.getDate());
        const endDate = new Date(date.getTime());
        endDate.setDate(endDate.getDate() + 1);
        const data = await StepCounter.queryPedometerDataBetweenDatesAsync(
          startDate.getTime(),
          endDate.getTime()
        );

        const steps = data?.numberOfSteps ?? 0;
        stepLog.push({ stepsAt: data?.startDate, steps });
      }
    } catch (err) {
      console.log("Error retrieving step log:", err);
    }

    const stepLogJson = JSON.stringify(stepLog); // JSON 형태로 변환
    webViewRef?.current?.postMessage(
      JSON.stringify({ type: "stepLog", stepLogJson })
    );
    return stepLog;
  };

  // AlarmManager를 2번 호출하는 함수, 여러번 호출되면 기기 성능에 영향을 미칠 수 있으므로 1일 1회만 호출되도록 함
  const startAlarmManager = async () => {
    const lastAlarmManagerCallKey = "@lastAlarmManagerCall"; // AlarmManager를 마지막으로 호출한 날짜를 저장하는 AsyncStorage 키
    const currentDate = new Date();
    const lastAlarmManagerCall = await AsyncStorage.getItem(
      lastAlarmManagerCallKey
    );

    if (lastAlarmManagerCall) {
      const lastAlarmManagerCallDate = new Date(lastAlarmManagerCall);
      if (
        currentDate.getFullYear() === lastAlarmManagerCallDate.getFullYear() &&
        currentDate.getMonth() === lastAlarmManagerCallDate.getMonth() &&
        currentDate.getDate() === lastAlarmManagerCallDate.getDate()
      ) {
        return;
      }
    }

    console.log("Calling AlarmManager...");
    await PedometerUtilModule.cancelAlarm(); // 이전에 등록한 알람을 취소합니다.
    await PedometerUtilModule.startAlarmManager(); // 1번째 알람을 등록합니다.
    await PedometerUtilModule.startAlarmManager(); // 2번째 알람을 등록합니다.
    await AsyncStorage.setItem(lastAlarmManagerCallKey, currentDate.toString());
  };

  // 처음 로딩되었을 때 걸음수를 가져오는 함수
  const gettingStepCount = async () => {
    const startDate = new Date();

    if (Platform.OS === "ios") {
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date();
      StepCounter.queryPedometerDataBetweenDates(
        startDate.getTime(), // react native can't pass Date object, so you should pass timestamp.
        endDate.getTime(),
        async (error, data) => {
          const steps = data?.numberOfSteps ?? 0;
          stepCount.current = steps;
          setTimeout(() => {
            webViewRef?.current?.postMessage(
              JSON.stringify({ type: "steps", steps })
            );
            if (BackgroundService.isRunning()) {
              BackgroundService.updateNotification({
                taskDesc: `👟 ${steps} 걸음`,
              });
            }
          }, 500);
        }
      );
    }
    if (Platform.OS === "android") {
      startDate.setHours(12, 0, 0, 0);
      const endDate = new Date();
      endDate.setHours(12, 0, 0, 0);
      StepCounter.queryPedometerDataBetweenDates(
        startDate.getTime(),
        endDate.getTime(),

        async (error, data) => {
          const steps = data?.numberOfSteps ?? 0;
          stepCount.current = steps;

          setTimeout(() => {
            webViewRef?.current?.postMessage(
              JSON.stringify({ type: "steps", steps })
            );
            if (BackgroundService.isRunning()) {
              BackgroundService.updateNotification({
                taskDesc: `👟 ${steps} 걸음`,
              });
            }
          }, 500);
        }
      );
    }
  };

  // 걸음수 센서의 변화를 감지하고 실시간으로 걸음수를 가져오는 함수
  const trackingStep = async () => {
    const startDate = new Date();

    if (Platform.OS === "android") {
      startDate.setHours(23, 59, 59, 59);
    }
    if (Platform.OS === "ios") {
      startDate.setHours(0, 0, 0, 0);
    }

    const pedometerDataCallback = async (pedometerData) => {
      const steps = pedometerData?.numberOfSteps;

      stepCount.current = steps;

      if (BackgroundService.isRunning()) {
        BackgroundService.updateNotification({
          taskDesc: `👟 ${steps} 걸음`,
        });
      }
      webViewRef?.current?.postMessage(
        JSON.stringify({ type: "steps", steps })
      );
    };

    StepCounter.startPedometerUpdatesFromDate(
      startDate.getTime(),
      pedometerDataCallback
    );
  };

  const backgroundInit = async () => {
    await new Promise(() => {
      BackgroundService.updateNotification({
        taskDesc: `👟 ${stepCount.current} 걸음`,
      });
    })
      .then(() => console.log("bg init"))
      .catch((err) => console.log(err));
  };

  // 실시간 걸음수 측정을 위해 걸음수 센서를 시작하는 함수
  useEffect(() => {
    if (streaming) {
      trackingStep();
    }
  }, [streaming]);

  const startAllulu = async () => {
    UserStore.setIsBackgroundForNecessaryUtils(false);
    if (Platform.OS === "android") {
      await BackgroundService.stop();
      await BackgroundService.start(
        backgroundInit,
        manbogiBackgroundServiceOptions
      );
      await startAlarmManager();
    } else if (Platform.OS === "ios") {
      await StepCounter.requestPermission();
    }
    await setStreaming(true);
    await gettingStepCount();
    await getStepLogJson();
  };

  async function handleAppStateChange() {
    UserStore.setIsBackgroundForNecessaryUtils(false);

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        (Platform.OS !== "android" || Platform.Version <= 31) &&
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        startAllulu();
      }
      appState.current = nextAppState;
    });

    return subscription;
  }

  useEffect(() => {
    const subscription = handleAppStateChange();
    return () => {
      subscription.then((s) => s.remove());
    };
  }, []);

  const reloadWebview = () => {
    webViewRef?.current?.reload();
  };

  const isThrottle = (key) => {
    return !throttleRef.current?.[key];
  };

  const setThrottle = (key, delay) => {
    throttleRef.current = { [key]: true };
    setTimeout(() => {
      throttleRef.current = { [key]: false };
    }, delay);
  };

  const backAction = () => {
    webViewRef?.current?.postMessage(JSON.stringify({ type: "backPress" }));
    return true;
  };

  useEffect(() => {
    loadBackAction();
    return () => {
      unLoadBackAction();
    };
  }, []);

  const loadBackAction = () => {
    BackHandler.addEventListener("hardwareBackPress", backAction);
  };

  const unLoadBackAction = () => {
    BackHandler.removeEventListener("hardwareBackPress", backAction);
  };

  const onWebviewMessage = (event) => {
    if (event?.nativeEvent?.data?.includes(`{"type":"ready"`)) {
      webViewRef?.current?.postMessage(
        JSON.stringify({
          type: "initWeb",
          data: {
            userId: UserStore.userInfo?._id,
            codePushVersion: configs.codePushVersion,
            appVersion: VersionCheck.getCurrentVersion(),
            token: AuthStore.token,
          },
        })
      );
    }
    if (event?.nativeEvent?.data === "startAllulu") {
      startAllulu();
    }

    if (event?.nativeEvent?.data === "goBack") {
      Alert.alert("종료", "정말 올룰루를 종료하시겠습니까?", [
        {
          text: "확인",
          onPress: () => navigation.navigate("추천"),
        },
        { text: "취소", onPress: () => null, style: "cancel" },
      ]);
      return true;
    }
    if (event?.nativeEvent?.data === "loadUserCoupon") {
      UserStore.loadUserCoupons();
      return true;
    }
  };

  const handleWebviewRequest = async (event) => {
    const url = event.url;
    if (!isThrottle("totalThrottle")) {
      return;
    }
    setThrottle("totalThrottle", 1000);

    // const isRequestSteps =
    //   url.includes('#requestSteps') && event?.loading === true

    if (url.includes("#closeGame")) {
      navigation.goBack();
      return false;
    }

    if (url.includes("#purchase")) {
      const purchaseData = decodeURIComponent(url.split("#purchase.")[1]);
      const commonPurchaseReward = JSON.parse(purchaseData);
      navigation.navigate("AlluluPurchaseScreen", { commonPurchaseReward });
    }

    if (url.includes("#vibrate")) {
      Vibration.vibrate(100);
      return false;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <WebView
          style={{ flex: 1 }}
          ref={webViewRef}
          bounces={false}
          source={{
            uri: `${configs.alluluUrl}/?token=${AuthStore.token}#requestSteps&randomNumber=${randomString}`,
          }}
          javaScriptEnabled
          onMessage={onWebviewMessage}
          mixedContentMode="always"
          overScrollMode="never"
          userAgent="allulu"
          onShouldStartLoadWithRequest={
            Platform.OS === "ios" ? handleWebviewRequest : () => true
          }
          onNavigationStateChange={
            Platform.OS === "android" ? handleWebviewRequest : () => true
          }
          onContentProcessDidTerminate={reloadWebview}
          textZoom={100}
          allowsInlineMediaPlayback={false}
          automaticallyAdjustContentInsets={false} // 추가
          contentInset={{ top: 0, right: 0, bottom: 0, left: 0 }} // 추가
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
};

export default AlluluScreen;
