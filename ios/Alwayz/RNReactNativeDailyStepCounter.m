//
//  RNReactNativeDailyStepCounter.m
//
//  Created by Park GunTae.
//

#import "RNReactNativeDailyStepCounter.h"

#import <CoreMotion/CoreMotion.h>
#import <React/RCTBridge.h>
#import <React/RCTEventDispatcher.h>

@implementation RNReactNativeDailyStepCounter


RCT_EXPORT_MODULE(RNReactNativeDailyStepCounter);


- (NSArray<NSString *> *)supportedEvents{
    return @[@"stepCountChanged"];
}


RCT_EXPORT_METHOD(isStepCountingAvailable:(RCTResponseSenderBlock) callback) {
    callback(@[[NSNull null], @([CMPedometer isStepCountingAvailable])]);
}

RCT_EXPORT_METHOD(isPedometerEventTrackingAvailable:(RCTResponseSenderBlock) callback) {
#if __IPHONE_OS_VERSION_MAX_ALLOWED >= 100000
        callback(@[[NSNull null], @([CMPedometer isPedometerEventTrackingAvailable])]);
#else
        callback(@[@"not available", @(NO)]);
#endif
}

RCT_EXPORT_METHOD(queryPedometerDataBetweenDates:(NSDate *)startDate endDate:(NSDate *)endDate handler:(RCTResponseSenderBlock)handler) {
    [self.pedometer queryPedometerDataFromDate:startDate
                                        toDate:endDate
                                   withHandler:^(CMPedometerData *pedometerData, NSError *error) {
                                       if (error) {
                                           handler(@[error.localizedDescription, [NSNull null]]);
                                       } else if (pedometerData) {
                                           NSDictionary *dict = [self dictionaryFromPedometerData:pedometerData];
                                           handler(@[[NSNull null], dict]);
                                       } else {
                                           handler(@[@"No data found", [NSNull null]]);
                                       }
                                   }];
}



RCT_EXPORT_METHOD(startPedometerUpdatesFromDate:(NSDate *)date) {
    [self.pedometer startPedometerUpdatesFromDate:date?:[NSDate date]
                                      withHandler:^(CMPedometerData *pedometerData, NSError *error) {
                                          if (error) {
                                              NSLog(@"Error while starting pedometer updates: %@", error.localizedDescription);
                                          } 
                                          if (pedometerData) {
                                            NSDictionary *dict = [self dictionaryFromPedometerData:pedometerData];
                                            [self sendEventWithName:@"stepCountChanged" body:dict];
                                          }
                                      }];
}


RCT_EXPORT_METHOD(stopPedometerUpdates) {
    [self.pedometer stopPedometerUpdates];
}

RCT_EXPORT_METHOD(authorizationStatus:(RCTResponseSenderBlock) callback) {
    NSString *response = @"not_available";
#if __IPHONE_OS_VERSION_MAX_ALLOWED >= 110000
        CMAuthorizationStatus status = [CMPedometer authorizationStatus];
        switch (status) {
            case CMAuthorizationStatusDenied:
                response = @"denied";
                break;
            case CMAuthorizationStatusAuthorized:
                response = @"authorized";
                break;
            case CMAuthorizationStatusRestricted:
                response = @"restricted";
                break;
            case CMAuthorizationStatusNotDetermined:
                response = @"not_determined";
                break;
            default:
                break;
        }
#endif
    callback(@[[NSNull null], response]);
}

/** Returns a new NSDate object with the time set to the indicated hour,
  * minute, and second.
  * @param hour The hour to use in the new date.
  * @param minute The number of minutes to use in the new date.
  * @param second The number of seconds to use in the new date.
  */
-(NSDate *) dateSetTime:(NSDate *)date
                  hour:(NSInteger)hour
                  minute:(NSInteger)minute
                  second:(NSInteger)second
{
   NSCalendar *calendar = [NSCalendar currentCalendar];
   NSDateComponents *components = [calendar components: NSCalendarUnitYear|
                                                         NSCalendarUnitMonth|
                                                         NSCalendarUnitDay
                                               fromDate:date];
    [components setHour:hour];
    [components setMinute:minute];
    [components setSecond:second];
    NSDate *newDate = [calendar dateFromComponents:components];
    return newDate;
}


- (NSDictionary *)dictionaryFromPedometerData:(CMPedometerData *)data {
    static NSDateFormatter *formatter;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
      formatter = [[NSDateFormatter alloc] init];
      formatter.dateFormat = @"yyyy-MM-dd";
      formatter.locale = [NSLocale localeWithLocaleIdentifier:@"ko_KR"];
      formatter.timeZone = [NSTimeZone timeZoneWithName:@"Asia/Seoul"];
    });
    return @{@"date": [formatter stringFromDate:data.endDate]?:[NSNull null],
             @"startDate": [formatter stringFromDate:data.startDate]?:[NSNull null],
             @"endDate": [formatter stringFromDate:data.endDate]?:[NSNull null],
             @"numberOfSteps": data.numberOfSteps?:[NSNull null]};
}


- (instancetype)init
{
    self = [super init];
    if (self == nil) {
        return nil;
    }

    _pedometer = [[CMPedometer alloc] init];
    
    return self;
}

// Please add this one
+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

// ??
- (dispatch_queue_t)methodQueue
{
    return dispatch_get_main_queue();
}


@end
