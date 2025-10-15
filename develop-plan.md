# 第1次リリース
DBなし、フローティングアニメーションなしでのリリースを行う。

* タイマー
    * live-main：タイマー、コース情報、ロボ名、ゼッケン番号、得点
    * onsite-timer：タイマー、競技ステータス
    * )timer：タイマー制御
* 得点情報
    * live-main
    * live-point：得点情報（順番、内訳付き）
    * live-ballJudge
    * )point

# 第2次リリース
フローティングアニメーション

# 第3次リリース
SQLiteと同期
* タイマー・得点情報
    * 得点・タイマー結果を記録
    * live-leaderboard
* 競技情報
    * live-robotInfo