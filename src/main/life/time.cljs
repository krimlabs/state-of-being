(ns life.time
  (:require [clojure.string]))

(defn zero-pad [num]
  (if (< num 10)
    (str "0" num)
    (str num)))

(defn get-current-date []
  (let [today (js/Date.)
        year (.getFullYear today)
        month (-> (inc (.getMonth today)) zero-pad)
        day (-> (.getDate today) zero-pad)]
    (str year "-" month "-" day)))

(defn get-current-year []
  (-> (get-current-date)
      (clojure.string/split #"-")
      first
      js/parseInt))

(defn get-current-month []
  (-> (get-current-date)
      (clojure.string/split #"-")
      second
      js/parseInt))

(defn get-current-day []
  (-> (get-current-date)
      (clojure.string/split #"-")
      (nth 2)
      js/parseInt))

(defn get-last-day-of-month [year month]
  (-> (js/Date. year month 0)
      .getDate))

(defn has-month-passed [year month]
  (let [today (js/Date.)
        current-year (.getFullYear today)
        current-month (inc (.getMonth today))]
    (cond
      (< year current-year) true
      (and (= year current-year) (< month current-month)) true
      :else false)))

(defn get-month-name [month-number]
  (let [months ["January" "February" "March" "April" "May" "June" "July" "August" "September" "October" "November" "December"]]
    (if (and (<= 1 month-number) (<= month-number 12))
      (nth months (dec month-number))
      "Invalid month number")))

(defn get-weekdays-in-month [year month]
  (let [first-day (js/Date. year (dec month) 1)
        last-day (js/Date. year month 0)
        days-count (- (.getDate last-day) (.getDate first-day))
        days-array (->> (range (inc days-count))
                        (map #(js/Date. year (dec month) %)))]
    (->> days-array
         (filter #(not (or (= (.getDay %) 0) (= (.getDay %) 6))))
         count)))
