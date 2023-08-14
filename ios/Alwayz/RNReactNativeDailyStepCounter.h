#if __has_include("RCTBridgeModule.h")
#import "RCTBridgeModule.h"
#else
#import <React/RCTBridgeModule.h>
#endif
#import <CoreMotion/CoreMotion.h>
#import <React/RCTEventEmitter.h>

@interface RNReactNativeDailyStepCounter : RCTEventEmitter <RCTBridgeModule>
@property (nonatomic, readonly) CMPedometer *pedometer;
@end
