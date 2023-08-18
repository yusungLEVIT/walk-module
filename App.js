import React, { useState, useEffect, useRef } from 'react'
import { Alert, Linking, Platform, Text } from 'react-native'

import moment from 'moment'

require('moment-timezone')

moment.tz.setDefault('Asia/Seoul')

const App = () => {
  const [, set] = useState()

  useEffect(() => {
    console.log('app js useEffect')
  }, [])

  return (
    <>
      <Text>헬로우</Text>
    </>
  )
}

export default App
