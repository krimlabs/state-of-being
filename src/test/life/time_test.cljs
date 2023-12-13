(ns life.time-test
  (:require [cljs.test :refer (deftest is)]
            [life.time :as time]))

(deftest test-get-last-day-of-month
  (is (= 31 (time/get-last-day-of-month 2023 1)))
  (is (= 28 (time/get-last-day-of-month 2023 2))))

(deftest test-has-month-passed
  (is (time/has-month-passed 2022 12))
  (is (time/has-month-passed 2022 11))
  (is (time/has-month-passed 2021 12)))

(deftest test-get-month-name
  (is (= "January" (time/get-month-name 1)))
  (is (= "February" (time/get-month-name 2))))

(deftest test-get-weekdays-in-month
  (is (= 21 (time/get-weekdays-in-month 2023 1))))
