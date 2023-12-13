(ns life.notion
  (:require [cljs.core.async :refer [go <!]]
            [clojure.string :as str]))

(def db-ids
  {:observations "71681b1b2a5a46549ac4b2e7009e13d8"
   :meditations "5dbc0d1f7cab4a618295a8f0e11a89b5"
   :nodes "4bcaa64e19504affa3add738ab93d45f"
   :women "ec74816d64f84dc7be63854eb88cb4db"})

(def anchor-node-ids
  {:meditateEveryDayObj "0d589e8a12ef4c71a8a87a2492ad0257"
   :workoutFiveTimesAWeekObj "9e7aa2f59e7041718ce19b7f8511269b"
   :awarnessObjective "6492e9e915be40a3a117a01363654402"})

(def Properties
  {:WINDMILL_STATE "Windmill State"
   :STATUS "Status"})

(def Statuses
  {:IN_PROGRESS "In Progress"
   :DONE "Done"})

(def Selects
  {:KEY_RESULT "Key Result"
   :IN_PROGRESS "In Progress"
   :DONE "Done"})

(def WindmillStateContains
  {:AUTO_MEDITATION "AutoMeditationKeyResult"
   :AUTO_WORKOUTS "AutoWorkoutKeyResult"
   :AUTO_OBSERVATIONS "AutoObservationsKeyResult"
   :HELLO_WORLD "HelloWorld"})

(defn retrieve-notion-page [token params]
  (let [notion (js/Client. #js {:auth token})]
    (.pages.retrieve notion params)))

(defn create-notion-page [token database-id properties emoji]
  (let [notion (js/Client. #js {:auth token})
        page-properties #js {:parent {:database_id database-id}
                             :properties (js->clj properties :keywordize-keys true)
                             :icon #js {:type "emoji" :emoji (or emoji "🤖")}}]
    (-> notion
        (.pages.create page-properties))))

(defn update-notion-page [token page-id update-options]
  (let [notion (js/Client. #js {:auth token})]
    (try
      (.pages.update notion #js {:page_id page-id} update-options)
      (catch js/Error error
        (println "Error updating Notion page:" (.body error))))))

(defn query-notion-db [token query-params]
  (let [notion (js/Client. #js {:auth token})]
    (.databases.query notion query-params)))

(defn notion-db-results-generator [token query-params]
  (let [start-cursor (atom nil)]
    (loop []
      (let [res (<! (go (query-notion-db token (assoc query-params :start_cursor @start-cursor))))]
        (when res
          (do
            (swap! start-cursor #(.-next_cursor res))
            (when-not (.-next_cursor res) (recur))))))))


(defn get-observations-for-month-and-year [token month year & [per-page]]
  (let [observations-res (notion-db-results-generator token
                          {:database_id observations-db-id
                           :page_size (or per-page 100)
                           :filter {:and [{:property "Date"
                                           :date {:on_or_after (str year "-" month "-01")
                                                  :is_not_empty true}}
                                          {:property "Date"
                                           :date {:is_not_empty true
                                                  :on_or_before (str year "-" month "-" (getLastDayOfMonth year month))}}]}})]
    (->> (async/into [] observations-res)
         (mapcat :results)
         (map #(assoc % :month (-> (-> % :properties "Date" :date :start) (clojure.string/split #"-") second)))
         (async/into []))))

(defn get-meditations-for-month-and-year [token month year & [per-page]]
  (let [res (notion-db-results-generator token
              {:database_id meditations-db-id
               :page_size (or per-page 100)
               :filter {:and [{:property "Date"
                               :date {:on_or_after (str year "-" month "-01")
                                      :is_not_empty true}}
                              {:property "Date"
                               :date {:is_not_empty true
                                      :on_or_before (str year "-" month "-" (getLastDayOfMonth year month))}}]}})]
    (->> (async/into [] res)
         (mapcat :results)
         (map #(assoc % :month (-> (-> % :properties "Date" :date :start) (clojure.string/split #"-") second)))
         (async/into []))))
