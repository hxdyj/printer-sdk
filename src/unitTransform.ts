const MillimetersConversionInchesRate = 1 / 25.4
export const UnitTransform = {
  MILLIMETERS_TO_CENTIMETERS(input: number) {
    return input / 10
  },
  MILLIMETERS_TO_INCHES(input: number) {
    return input * MillimetersConversionInchesRate
  },
}
