'use strict';
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var isoCountryCurrency = require('iso-country-currency');
var crypto = require('crypto');

//initialize variables
var port = process.env.PORT || 3000; 
var users = [
{
	firstName: 'Jhon',
	lastName: 'Doe',
	userEmail: 'jhondoe@gmail.com',
	userPassword: 'XunTpzbZ6GQs6+8W8GX/DHi7MpqaN8peDJP8UF/otdE=', //jhonPassword
	country: 'Canada' //country for local currency, registeration
},
{
	firstName: 'Rita',
	lastName: 'Jack',
	userEmail: 'ritajack@gmail.com',
	userPassword: 'XunTpzbZ6GQs6+8W8GX/DHi7MpqaN8peDJP8UF/otdE=', //ritaPassword
	country: 'Germany' //country for local currency, registeration
},
{
	firstName: 'Mohammad',
	lastName: 'Ameen',
	userEmail: 'mameen@gmail.com',
	userPassword: 'XunTpzbZ6GQs6+8W8GX/DHi7MpqaN8peDJP8UF/otdE=', //ameenPassword
	country: 'Pakistan' //country for local currency, registeration
}
];
var app = express();

//routes
var indexRouter = require('./routes/index');
//var usersRouter = require('./routes/users');
var dashboardRouter = require('./routes/dashboard');
//var loginRouter = require('./routes/login');


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//inject the user's authToken in the request 
app.use((req, res, next) => {
    // Get auth token from the cookies
    req.authToken = req.cookies['AuthToken'];
    req.user = req.cookies['userInfo'];

    next();
});

app.use('/', indexRouter);
//app.use('/users', usersRouter);
app.use('/dashboard', dashboardRouter);
//app.use('/login',loginRouter);
app.get('/login', (req, res) => { 
	console.log("step 3")
	
	if(req.user){
		res.render('dashboard.hbs', {firstName: 'Jhon',lastName: 'Doe',userEmail: 'jhondoe@gmail.com',}); ///@todo: send info saved in auth token
	}
	else{
		res.render('login.hbs', {message: "Invalid username or password. Login get", messageClass: 'alert-danger'});
	}       
});

app.post('/login', (req, res)=>{
	console.log("step2")
	let {userEmail, userPassword} = req.body;
	const sha256 = crypto.createHash('sha256');
	let userHashedpassword = sha256.update(userPassword).digest('base64'); // convert password to hash
	console.log(userEmail)
	console.log(userHashedpassword)
	console.dir(users)
	let user = users.find(u => u.userEmail === userEmail && u.userPassword === userHashedpassword);
	console.dir(user)
	if(user){
		let authToken = crypto.randomBytes(30).toString('hex');   
		
		// Setting the auth token in cookies
        res.cookie('AuthToken', authToken);
        res.cookie('userInfo', user);
		
		//res.render('dashboard.hbs', {firstName: 'Jhon',lastName: 'Doe',userEmail: 'jhondoe@gmail.com',}); ///@todo: send info saved in auth token
		//currency 
		let userCountryISO = isoCountryCurrency.getISOByParam('countryName', user.country);
		let userCountryCurrency = isoCountryCurrency.getParamByISO(userCountryISO, 'currency');;
		let userCountryCurrencySymbol = isoCountryCurrency.getParamByISO(userCountryISO, 'symbol');
		res.render('dashboard.hbs', {...user, 'userCountryCurrency':userCountryCurrency, 'userCountryCurrencySymbol':userCountryCurrencySymbol }); ///@todo: send info saved in token
	}
	else{
		console.log("login fail")
		res.render('login.hbs', {message: "Invalid username or password. login post fail", messageClass: 'alert-danger'});
	}
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

//create server 
app.listen(port, function(){console.log("the server starts")});

module.exports = app;
