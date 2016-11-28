var http = new XMLHttpRequest();
var url = "http://brunydevwsv01.devbruin.com/notificationapi/email/useremail";
var params = "";
params = JSON.stringify({"emailType":"PasswordResetSuccess","userName":"zhenxi.mi@gmail.com","verifyLink":"http://portal.devbruin.com/user/verify?request_id=48F93319-8B77-4782-8E9C-A8A396C36788","clientId":"83784"});
http.open("POST", url, true);

//Send the proper header information along with the request
http.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');

http.onreadystatechange = function() {//Call a function when the state changes.
    if(http.readyState == 4 && http.status == 200) {
        var replacement = http.responseText;
        alert(replacement);
        document.write(replacement);
        document.close();
    }
}
http.send(params);
