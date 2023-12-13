(ns life.workouts
  (:require [life.config :refer (workout-tracker-sheet-id
                                 google-sheets-api-key)]
            [cljs.core.async :refer [go]]
            [cljs.core.async.interop :refer-macros [<p! <!]]
            ["axios" :as axios]))

(defn fetch-spreadsheet-data [spreadsheet-id api-key]
  (go
    (let [url (str "https://sheets.googleapis.com/v4/spreadsheets/" spreadsheet-id)
          params {:params {:key api-key}}
          res (<p! (.get axios url params))]
      (prn res))))


(comment
  (go
    (prn (<! (fetch-spreadsheet-data workout-tracker-sheet-id google-sheets-api-key))))
  ,)
