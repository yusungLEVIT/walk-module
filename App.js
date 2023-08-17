/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */
import React, { useState, useEffect, useRef } from 'react'
import { Alert, Linking, Platform, Text } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import analytics from '@react-native-firebase/analytics'
import crashlytics from '@react-native-firebase/crashlytics'
import AsyncStorage from '@react-native-async-storage/async-storage'
import codePush from 'react-native-code-push'
import VersionCheck from 'react-native-version-check'
import appsFlyer from 'react-native-appsflyer'
import moment from 'moment'
import configs from './src/utils/configs'
import backendApis from './src/utils/backendApis'
import RootNavigator from './src/navigators/RootNavigator'
import ForceUpdateModal from './src/components/Modal/FroceUpdateModal'
import UserStore from './src/stores/UserStore'
import Log from './src/utils/log'
import StoreManager from './src/components/StoreManager'
import DebuggingAlertComponent from './src/components/DebuggingAlertComponent'
import * as Sentry from '@sentry/react-native'
import ItemStore from './src/stores/ItemStore'
/* global __DEV__ */

const isHermes = () => !!global.HermesInternal
console.log('app js engine :', isHermes ? 'hermes' : 'jsc')

require('moment-timezone')

moment.tz.setDefault('Asia/Seoul')

// import { observer } from 'mobx-react-lite'

const Stack = createStackNavigator()

const codePushOptions = {
  checkFrequency: codePush.CheckFrequency.MANUAL,
}

console.log('prepare stack navigation')

const App = () => {
  const [showForceUpdateModal, setShowForceUpdateModal] = useState(false)
  const navigationRef = useRef()
  const routeNameRef = useRef()
  const routesRef = useRef([])

  Text.defaultProps = Text.defaultProps || {}
  Text.defaultProps.allowFontScaling = false
  const codePushManager = async () => {
    const appVersion = VersionCheck.getCurrentVersion()
    const appVersionNumber = appVersion
      .split('.')
      .map((numString, index) => parseInt(numString, 10) * 100 ** (2 - index))
      .reduce((a, b) => a + b)
    const { codePushVersion } = configs
    const codePushAppVersionNumber = codePushVersion
      .split('.')
      .map((numString, index) => parseInt(numString, 10) * 100 ** (2 - index))
      .reduce((a, b) => a + b)
    console.log(`appversion number: ${appVersionNumber}`)
    const actualAppVersionNumber = Math.max(
      codePushAppVersionNumber,
      appVersionNumber,
    )
    const updateThresholds = await backendApis.getUpdateThreshold()
    if (updateThresholds) {
      if (
        updateThresholds.mandatoryUpdateThreshold >= actualAppVersionNumber &&
        actualAppVersionNumber > updateThresholds.forceUpdateThreshold
      ) {
        const updateLaterCheckPoint = await AsyncStorage.getItem(
          '@alwayz@updateLaterCheckPoint',
        )
        if (
          !updateLaterCheckPoint ||
          JSON.parse(updateLaterCheckPoint).appVersionNumber !==
            actualAppVersionNumber
        ) {
          // Checked
          Alert.alert(
            '업데이트 안내',
            '새로 출시된 기능들을 사용하려면 업데이트를 해주세요.',
            [
              {
                text: '다음에',
                onPress: async () => {
                  await AsyncStorage.setItem(
                    '@alwayz@updateLaterCheckPoint',
                    JSON.stringify({
                      appVersionNumber: actualAppVersionNumber,
                    }),
                  )
                },
              },
              {
                text: '업데이트하기',
                onPress: () => {
                  Linking.openURL('https://alwayzshop.ilevit.com/app')
                },
              },
            ],
          )
          // }
        }
      }
      //  {
      //   setAppVersionNumber(actualAppVersionNumber)
      //   setForceUpdateThreshold(updateThresholds.forceUpdateThreshold)
      else if (
        actualAppVersionNumber <= updateThresholds.forceUpdateThreshold
      ) {
        setShowForceUpdateModal(true)
        // }
      }
    }

    // backendApis.postUserAppVersion(appVersion, codePushVersion)
  }

  // const _handleAppStateChange = async (nextAppState) => {
  //   appState.current = nextAppState
  //   if (nextAppState === 'active' && !UserStore.isBackgroundForNecessaryUtils) {
  //     try {
  //       await codePush.notifyAppReady()
  //       await codePush.sync(
  //         {
  //           updateDialog: false,
  //           installMode: codePush.InstallMode.IMMEDIATE,
  //         },
  //         // (status) => {
  //         //   if (status === 1) {
  //         //     codePush.restartApp()
  //         //   }
  //         // },
  //       )
  //     } catch (err) {
  //       console.log(err)
  //     }
  //   }
  // }

  useEffect(() => {
    crashlytics().log('App mounted.')

    // 서버 헬스체크
    fetch(
      `${configs.backendUrl}/health-check?os=${Platform.OS}&appVersion=${configs.codePushVersion}`,
    )
      .then(async (res) => {
        // 서버 정상 공지없음
        if (res?.status === 204) return

        // 서버 비정상
        if (res?.status >= 400) {
          Alert.alert(
            '안내',
            '현재 서비스 접속이 원활하지 않습니다. 인터넷 연결을 확인하거나 잠시 후 다시 시도해주세요.',
            [
              {
                text: '확인',
              },
            ],
          )
          return
        }

        // 서버 정상 공지있음
        const data = await res.json()
        if (typeof data?.title === 'string' && data?.msg) {
          Alert.alert(
            data?.title || '알림',
            typeof data?.msg === 'string'
              ? data?.msg
              : JSON.stringify(data?.msg),
            [
              {
                text: '확인',
              },
            ],
          )
        }
      })
      .catch((err) => {
        console.log(err)
      })

    codePushManager()
    UserStore.setRouteNameRef(routeNameRef)
  }, [])
  const navigationConfig = {
    screens: {
      // RootNavigator: {
      //   screens: {
      //     AdvertisementCheckScreen: 'adLink/:channel/:adNumber',
      //   },
      // },
      RootNavigator: 'adLink/:channel/:adNumber',
      // {
      //   screens: {
      //     MainStackNavigator: {
      //       screens: {
      //         MainStackAMainTabNavigator: 'adLink/:adType/:adNumber',
      //         MainStackDItemScreen: 'item/:itemId/:teamDealId',
      //         FeedScreen: 'feed/:feedId',
      //         FriendScreen: 'friend/:friendId',
      //       },
      //     },
      //   },
      // },
    },
  }
  const linking = {
    prefixes: ['alwayz://'],
    config: navigationConfig,
  }
  return (
    <>
      <ForceUpdateModal
        showModal={showForceUpdateModal}
        setShowModal={setShowForceUpdateModal}
        onPress={() => {
          Linking.openURL('https://alwayzshop.ilevit.com/app')
        }}
      />
      <NavigationContainer
        linking={linking}
        ref={navigationRef}
        onStateChange={async () => {
          const previousRouteName = routeNameRef?.current
          const previousRoutes = routesRef?.current
          const currentRoute = navigationRef?.current?.getCurrentRoute()
          UserStore.setCurrentScreenName(currentRoute?.name)

          ItemStore.checkAndSetPreviousIsFrom()

          if (previousRouteName !== currentRoute?.name) {
            let userUsage = ``

            userUsage = `${currentRoute?.name}`

            await UserStore.uploadUserUsage(userUsage)
            analytics().logScreenView({
              screen_name: `${currentRoute?.name}_${configs.nodeEnv}`,
              screen_class: `${currentRoute?.name}_${configs.nodeEnv}`,
            })
          }
          routeNameRef.current = currentRoute?.name

          let routesStack = [currentRoute, ...previousRoutes]
          // 뒤로가기 인경우 히스토리 스택 제거 (arr[0].key === arr[2].key)
          if (
            routesStack?.length >= 3 &&
            routesStack[0]?.key === routesStack[2]?.key
          ) {
            routesStack = routesStack.slice(2)
          }
          routesRef.current = routesStack
        }}
      >
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: '#fff' },
            gestureEnabled: false,
          }}
        >
          <Stack.Screen name='RootNavigator' component={RootNavigator} />
        </Stack.Navigator>
      </NavigationContainer>
      <StoreManager />
      <DebuggingAlertComponent />
    </>
  )
}

export default codePush(codePushOptions)(Sentry.wrap(App))
