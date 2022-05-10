let express = require("express");
let fs = require('fs');//文件模块
let mongoose = require("mongoose");
// 连接mongodb数据库
mongoose.connect("mongodb://localhost:27017/user", function (err) {
  if (err) return console.log(err);
  console.log("连接成功");
});
let Schema = mongoose.Schema;
let userSchema = new Schema({
  account: { type: String },
  password: { type: Number },
  level: { type: Number },
  state: { type: String },
  iptime:{type: Number}
});
let Users = mongoose.model("users", userSchema);
let CryptoJS = require("crypto-js");
let key = CryptoJS.enc.Utf8.parse("efabccee-b754-4c");
let cors = require("cors");
let app = express();
// Jwt
let expressJwt = require("express-jwt");
let jwt = require("jsonwebtoken");
//跨域
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  expressJwt({ secret: "qwer", algorithms: ["HS256"] }).unless({
    path: ["/Login","/verifyToken","/UserLock","/getUsers","/removeLock"],
  })
);
app.get("/Login", (req, res) => {
  // 账号密码解密
  function Decrypt(word) {
    let decrypt = CryptoJS.AES.decrypt(word, key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    });
    let decryptedStr = decrypt.toString(CryptoJS.enc.Utf8);
    return decryptedStr.toString();
  }
  let account = Decrypt(req.query.account);
  let password = Decrypt(req.query.password);

  /****************************************************/
  //数据库的用户
  Users.find(function (err, data) {
    if (err) {
      console.log(err);
    } else {
      let flag = false;
      for (let i = 0; i < data.length; i++) {
        if (data[i].account == account && data[i].password == password) {
          res.send({
            status: 200,
            msg: "登录成功",
            token:
              "Bearer " +
              jwt.sign({ username: req.body.username }, "qwer", {
                expiresIn: "60s",//过期时间
              }),
            level: data[i].level,
            state: data[i].state,
            iptime:data[i].iptime
          });
          flag = true;
          //写入日志
          //当前时间函数
          function getNowFormatDate() {
            let date = new Date();
            let seperator1 = "-" ;
            let seperator2 = ":" ;
            let month = date.getMonth() + 1;
            let strDate = date.getDate();
            if (month >= 1 && month <= 9) {
                month = "0" + month;
            }
            if (strDate >= 0 && strDate <= 9) {
                strDate = "0" + strDate;
            }
          let currentdate = date.getFullYear() + seperator1 + month + seperator1 + strDate
                    + " " + date.getHours() + seperator2 + date.getMinutes()
                    + seperator2 + date.getSeconds();
            return currentdate;
       }
        //  let fd = fs.openSync('Loginlog.txt','w')
        //   fs.writeSync(fd,`用户${account}登陆了时间是${getNowFormatDate()}`,10)
        //   fs.closeSync(fd);
        fs.writeFileSync('Loginlog.txt',`用户${account}登陆了时间是${getNowFormatDate()}    `,{flag:'a'});
          break;
        }
      }
      if(!flag){
        let flag1 = false;
        for(let i = 0;i<data.length;i++){
          if(data[i].account==account){
            flag1=true;
            res.send({
              status: 404,
              msg: "用户密码错误"
            });
            break;
          }
        }
        if(!flag1){
          res.send({
            status: 404,
            msg: "查无此人"
          });
        }
      }
    }
  });
});
//验证token时效性

function verifyToken (token) {
    try {
        jwt.verify(token,'qwer')
        return true

    } catch (error) {

        return false
    }
}
app.get('/verifyToken',function(req,res){
    console.log(req.query);
    let isValid =  verifyToken(req.query.Authorization.split(' ')[1]);
    res.send({status:200,isValid});
})

//锁定用户状态
app.get('/UserLock',function(req,res){
  let LockAccount = req.query.account;
  console.log(LockAccount);//数据库修改用户状态的地方
  Users.updateOne({account:LockAccount},{state:'lock'},function(error,result){
      if(!error){
        console.log('成功',result);
      }
  })
  res.send({
    status:200,
    msg:'修改用户状态为lock'
  })
})

//解除用户锁定状态
//1.获取用户全部状态信息
app.get('/getUsers',function(req,res){
  Users.find(function(error,data){
      if(!error){
        res.send({status:200,msg:'获取用户成功',users:data})
      }
  })
})

app.get('/removeLock',function(req,res){
  let account = req.query.account;
  console.log(account,"######");
  Users.updateOne({account},{state:'normal'},function(error,result){
    if(!error){
      console.log(result);
      res.send({status:200,msg:'修改用户状态成功'})
    }
  })
})

app.listen(8082, () => {
  console.log("服务器成功开启,端口号是8082");
});
