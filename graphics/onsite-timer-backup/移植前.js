myTimmode = 0;
myTim = 0;	//プルダウンメニューの時間設定
myMin = 2;	//制限分設定
mySec = 0;	//制限秒設定
mytmSec = 0;	//制限1/100秒設定
mymSec = 0;
startorstop = 0;	//計測時1 一時停止(データが残っている)なら2
status_now = 0;		//0:準備の待機・準備時間 1:競技開始・競技中 2:競技終了
onepulse = 3;	//タイマー1ルーチンを何/100秒で行うか
newdate=0;	//日付認識
nowms=0;	//今のミリ秒
pastms=0;	//元のミリ秒
timediffer=0;	//進んだミリ秒
myRetry=0;	//リトライ数
myGodhand=0;	//神の手数
myRetry_new=0;	//変更後のリトライ数
myGodhand_new=0;	//変更後の神の手数



document.addEventListener('keydown', keypress_event);

function keypress_event(e) {
	if (e.key === 'r') myRetryone();
	else if (e.key === 'n') myNext();
	else if (e.key === 'w') myReset();
	else if (e.key === 'Enter') myGo();
	else if (e.key === 't') myTimeChange();
}

function time_read(){	//制限時間読み込み
	mySelect = document.myForm.myMenu.selectedIndex;
	myTim = eval ( document.myForm.myMenu.options[mySelect].value );
	if (myTim==0) {	//5分
		myMin = 5;
		mySec = 0;
		mytmSec = 0;
		mymSec=0;
	}
	else {	//10分
		myMin = 10;
		mySec = 0;
		mytmSec = 0;
		mymSec=0;
	}
}

function check_timediffer(){
	pastms=nowms;
	var newdate = new Date();
	nowms =newdate.getMilliseconds();
	timediffer=nowms-pastms;
	if (timediffer<0)
	{
		timediffer+=1000;
	}
}

function rewrite_timer(){
	if (myMin>=10)	//分2ケタ
	{
		if (mySec>=10)	//秒数2ケタ
		{
			document.getElementById( "countdown_min" ).innerHTML = "" + myMin + ":" + mySec + "";
		}
		else	//秒数1ケタ
		{
			document.getElementById( "countdown_min" ).innerHTML = "" + myMin + ":0" + mySec + "";
		}
	}
	else	//分1ケタ
	{
		if (mySec>=10)	//秒数2ケタ
		{
			document.getElementById( "countdown_min" ).innerHTML = "!" + myMin + ":" + mySec + "";
		}
		else	//秒数1ケタ
		{
			document.getElementById( "countdown_min" ).innerHTML = "!" + myMin + ":0" + mySec + "";
		}
	}
	if (mytmSec>=10)	//1/100秒2ケタ
	{
		
		document.getElementById( "countdown_msec" ).innerHTML = " " + mytmSec + "";
	}
	else	//1/100秒1ケタ
	{
		
		document.getElementById( "countdown_msec" ).innerHTML = " 0" + mytmSec + "";
	}
}

function rewrite_status(){	//計測中の状況表示
	if (status_now==0)
	{
		document.getElementById( "countdown_status" ).innerHTML = "ロボット準備";
	}
	else if (status_now==1)
	{
		document.getElementById( "countdown_status" ).innerHTML = "競　 技　 中";
	}
//	else if (status_now=2)
//	{
//		document.getElementById( "countdown_status" ).innerHTML = "競技準備待機";
//	}
}

function myGo(){	//スタート/ストップボタン
	if (startorstop!=2&&status_now==2) {;}	//競技終了状態
	else
	{
		if(startorstop==0)	//スタート
		{
			var newdate = new Date();
			//pasttime =newdate.getMilliseconds();
          	nowms =newdate.getMilliseconds();
			startorstop=1;
			myTimmode = setInterval ( "myTimer()", 10*onepulse );	//タイマー設定
			rewrite_status();
		}
		else if(startorstop==1)	//一時停止
		{
			startorstop=2;
			clearInterval( myTimmode );
			document.getElementById( "countdown_status" ).innerHTML = "計測停止中";
		}
		else if (startorstop==2)	//再開
		{
			var newdate = new Date();
			//pasttime =newdate.getMilliseconds();
          	nowms =newdate.getMilliseconds();
			startorstop=1;
			myTimmode = setInterval ( "myTimer()", 10*onepulse );	//タイマー設定
			rewrite_status();
		}
	}
}

function myReset(){
	clearInterval( myTimmode );
	status_now=2;	//競技終了扱い
	myNext();
}

function myNext(){
	clearInterval( myTimmode );
	if (status_now==0 || status_now == 3)	//準備時間（3は準備時間タイムアップ→そのまま競技開始）
	{
		startorstop = 0;
		mySelect = document.myForm.myMenu.selectedIndex;
		myTim = eval ( document.myForm.myMenu.options[mySelect].value );
		time_read();
		rewrite_timer();
		if (status_now == 0) {
			status_now=1;
			document.getElementById( "countdown_status" ).innerHTML = "競技開始待機";
		}
		else if (status_now == 3) {
			status_now=1;
			myGo();
		}
	}
	else if (status_now==4)	//競技中
	{
		document.getElementById( "countdown_status" ).innerHTML = "競　技　終　了";
		status_now=2;
		startorstop = 0;
	}
	else if (status_now==2 || status_now==1)	//競技終了 or 競技中に次へをクリック→リセット
	{
		document.getElementById( "countdown_status" ).innerHTML = "ロボット準備待";
		status_now=0;
		startorstop = 0;
		myMin = 2;
		mySec = 0;
		mytmSec = 0;
		mymSec = 0;
		myRetry=0;
		myRetry_change();
		myGodhand=0;
		myGodhand_change();
		rewrite_timer();
	}
}

function myRetry_change() {	//表示変更
	document.getElementById( "retry_no" ).innerHTML = "" + myRetry + "";
}

function myRetryone() {
	myRetry++;
	myRetry_change();
	if (startorstop==1) {	//計測中なら一時停止する
		myGo();
	}
}

function myRetrycha() {
	myRetry_new = myRetry;
	myRetry_new = window.prompt("新しいリトライ数を入力してください", "");
	if (isNaN(myRetry_new)==true)
	{
		alert("数値を入力してください");
	}
	else if (myRetry_new != null && myRetry_new != "")
	{
		myRetry=myRetry_new;
		myRetry_change();
	}
}

function myGodhand_change() {	//表示変更
	if (myGodhand==0) {
		document.getElementById( "godhand_title" ).innerHTML = "";
		document.getElementById( "godhand_no" ).innerHTML = "";
	}
	else {
		document.getElementById( "godhand_title" ).innerHTML = "Godhand:";
		document.getElementById( "godhand_no" ).innerHTML = "" + myGodhand + "";
	}
}

function myGodone() {
	myGodhand++;
	myGodhand_change();
}

function myGodcha() {
	myGodhand_new = myGodhand;
	myGodhand_new = window.prompt("新しい神の手の回数を入力してください", "");
	if (isNaN(myGodhand_new)==true)
	{
		alert("数値を入力してください");
	}
	else if (myGodhand_new != null && myGodhand_new != "")
	{
		myGodhand=myGodhand_new;
		myGodhand_change();
	}
}

function myTimeChange() {
	if (startorstop == 1) myGo();	// 計測中は一時停止

	myTime_new = myTime;
	myTime_new = window.prompt("新しい時間を設定してください。（例：5:20:15）", "");
	if (isNaN(myTime_new)==true)
	{
		alert("時間を入力してください");
	}
	else
	{
		// 時間の変更処理
	}
}

function myTimer(){		//タイマールーチン 1/100秒に1回行う
	check_timediffer();
	mymSec-=timediffer;
	if (myMin==0&&mySec==0&&mymSec<=0)	//0秒
	{
		mymSec=0;
		clearInterval( myTimmode );
		if (status_now == 0) status_now = 3;	// 準備時間オーバー→そのまま競技開始
		else if (status_now == 1) status_now = 4;	// 競技時間オーバー→競技終了表示
		myNext();
	}
	else
	{
		if (mymSec<0)
		{
			mySec--;
			mymSec+=1000;
		}
		if (mySec<0)
		{
			myMin--;
			mySec+=60;
		}
	}
	mytmSec = (mymSec-(mymSec%10))/10;
	rewrite_timer();
}