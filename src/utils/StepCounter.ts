import {
  EmitterSubscription,
  EventSubscriptionVendor,
  NativeEventEmitter,
  NativeModule,
  NativeModules,
  Platform,
} from "react-native";

const NativeStepCounter: NativeStepCounter =
  NativeModules.RNReactNativeDailyStepCounter;

interface NativeStepCounter extends EventSubscriptionVendor, NativeModule {
  startPedometerUpdatesFromDate: (date: number) => void;
  startPedometer: () => void;
  stopPedometerUpdates: () => void;
  queryPedometerDataBetweenDates: (
    startDate: number,
    endDate: number,
    handler: (error: any, data: PedometerData) => void
  ) => void;

  authorizationStatus: (
    callback: (
      error: any,
      status:
        | "denied"
        | "authorized"
        | "restricted"
        | "not_determined"
        | "not_available"
    ) => void
  ) => void;
}

export type PedometerData = {
  startDate?: string;
  endDate?: string;
  date: string;
  numberOfSteps: number;
};

class Pedometer {
  private subscription?: EmitterSubscription;
  private EventEmitter: NativeEventEmitter;
  constructor() {
    this.EventEmitter = new NativeEventEmitter(NativeStepCounter);
  }

  public queryPedometerDataBetweenDates(
    startDate: number,
    endDate: number,
    handler: (error: any, data: PedometerData) => void
  ) {
    NativeStepCounter.queryPedometerDataBetweenDates(
      startDate,
      endDate,
      handler
    );
  }

  public async queryPedometerDataBetweenDatesAsync(
    startDate: number,
    endDate: number
  ) {
    return new Promise((res, rej) => {
      NativeStepCounter.queryPedometerDataBetweenDates(
        startDate,
        endDate,
        (error, data: PedometerData) => {
          if (error) return rej(error);
          res(data);
        }
      );
    });
  }

  public startPedometerUpdatesFromDate(
    date: number,
    handler?: (data: PedometerData) => void
  ) {
    if (this.subscription) {
      this.stopPedometerUpdates();
    }
    NativeStepCounter.startPedometerUpdatesFromDate(date);
    if (handler) {
      this.subscription = this.EventEmitter.addListener(
        "stepCountChanged",
        handler
      );
    }
  }

  public startPedometer() {
    if (this.subscription) {
      this.stopPedometerUpdates();
    }
    NativeStepCounter.startPedometer();
  }

  public stopPedometerUpdates() {
    NativeStepCounter.stopPedometerUpdates();
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = undefined;
    }
  }

  private ios_authorizationStatus() {
    if (Platform.OS !== "ios") return false;
    return new Promise((res, rej) => {
      NativeStepCounter.authorizationStatus(
        (
          error,
          status:
            | "denied"
            | "authorized"
            | "restricted"
            | "not_determined"
            | "not_available"
        ) => {
          if (error) return rej(error);
          res(status);
        }
      );
    });
  }

  private askPermissionIOS(): Promise<boolean> {
    return new Promise((res) => {
      this.queryPedometerDataBetweenDates(
        new Date().getDate(),
        new Date().getDate(),
        (error, data) => {
          if (data?.numberOfSteps === null) return res(false);
          res(true);
        }
      );
    });
  }

  public async checkPermission() {
    const permission = await this.ios_authorizationStatus();
    return permission;
  }

  public async requestPermission(): Promise<boolean> {
    const granted = await this.askPermissionIOS();
    return granted;
  }
}

const StepCounter = new Pedometer();

export default StepCounter;
