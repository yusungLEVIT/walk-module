const fs = require('fs')
const path = require('path')

const pipe2 = (fn1, fn2) => (arg) => fn2(fn1(arg))
const matchFirst = (reg) => (value) => {
  const [, first] = [].concat(reg.exec(value))

  return first
}
const parseDecimal = (it) => parseInt(it, 10)

const pbxprojPath = path.join('./ios/Alwayz.xcodeproj', 'project.pbxproj')
const currentIOSFile = fs.readFileSync(pbxprojPath, 'utf8')
const gradlePath = path.join('./android/app', 'build.gradle')
const currendAndroidFile = fs.readFileSync(gradlePath, 'utf8')

const iosCodeRegex = /CURRENT_PROJECT_VERSION = (\d+);/g
const androidCodeRegex = /versionCode (\d+)/

const currentIOSBuildNumber = pipe2(
  matchFirst(iosCodeRegex),
  parseDecimal,
)(currentIOSFile)
const currentAndroidBuildNumber = pipe2(
  matchFirst(androidCodeRegex),
  parseDecimal,
)(currendAndroidFile)
// console.log(currentIOSFile)
console.log(currentIOSBuildNumber)
console.log(currentAndroidBuildNumber)
fs.writeFileSync(
  './distVersion.js',
  `const androidBuildNumber = '${currentAndroidBuildNumber}'\nconst iosBuildNumber = '${currentIOSBuildNumber}'\nexport { androidBuildNumber, iosBuildNumber }\n`,
)
