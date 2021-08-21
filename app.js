'use strict';
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
//var logger = require('morgan');
var bodyParser = require('body-parser');
var isoCountryCurrency = require('iso-country-currency');
var crypto = require('crypto');
var BlockchainComExchangeRestApi = require('blockchain_com_exchange_rest_api');
var { nameOf, nameM, name } = require('crypto-symbol');

const CC = require('currency-converter-lt');
 
          
//initialize variables
var port = process.env.PORT || 3000;    
var app = express();
var users = [         
{   
	id: 1,
	name: 'Jhon Doe',
	userEmail: 'jhondoe@gmail.com', //unique emails
	userPassword: 'XunTpzbZ6GQs6+8W8GX/DHi7MpqaN8peDJP8UF/otdE=', //jhonPassword
	country: 'Canada' //country for local currency, registeration
},
{
	id: 2,
	name: 'Rita Jack',
	userEmail: 'ritajack@gmail.com',
	userPassword: 'PExy2xo0ma7T1idHQ8QLoSgrtQtRR9K4pTFr+mkE81Q=', //ritaPassword
	country: 'Germany' //country for local currency, registeration
},
{
	id: 3,
	name: 'Mohammad Ameen',
	userEmail: 'mameen@gmail.com',
	userPassword: 'H4yOjn3iCrH4megWDSYPtM6UTtTxPi2T1Cntd8wlTVI=', //ameenPassword
	country: 'Pakistan' //country for local currency, registeration
}
];
    

//@remove        
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

//app.use(logger('dev')); //@todo: what is this?
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));  // to support URL-encoded bodies
app.use(cookieParser());

//// use in production 
const publicRoot = '/Users/all/Desktop/blockchainProject/cryptoshowcasevue/dist' //@todo: change public root to dist of vue
app.use(express.static(publicRoot))


const getHashedPassword = (userPassword) => {
    const sha256 = crypto.createHash('sha256');
    const hash = sha256.update(userPassword).digest('base64');
    return hash;
}

const countryLocalCurrency = (country) => {
	let userCountryISO = isoCountryCurrency.getISOByParam('countryName', country);
	let userCountryCurrency = isoCountryCurrency.getParamByISO(userCountryISO, 'currency');;
	let userCountryCurrencySymbol = isoCountryCurrency.getParamByISO(userCountryISO, 'symbol');
	return {currency: userCountryCurrency, currencySymbol: userCountryCurrencySymbol};
}

const generateAuthToken = () => {
    return crypto.randomBytes(30).toString('hex');
}

const authMiddleware = (req, res, next) => {
    if (!req.authToken) {
        res.status(401).send('You are not authenticated')
    } else {
        return next()
    }
}


//Get the user's 'authToken' and 'UserInfo' token from cookies and inject in the request 
app.use((req, res, next) => {
    req.authToken = req.cookies['AuthToken'];
    req.user = req.cookies['UserInfo'];

    next();
});


// use in production 
app.get("/", (req, res, next) => {
  res.sendFile("index.html", { root: publicRoot })
});

app.post('/api/login', (req, res)=>{ 
	let {userEmail, userPassword} = req.body;
	let userHashedpassword = getHashedPassword(userPassword); // convert password to hash

	
	let user = users.find(u => u.userEmail === userEmail && u.userPassword === userHashedpassword); 
	
	if(user){
		let authToken = generateAuthToken();   
		
		// Setting the AuthToken and UserInfo in cookies
        res.cookie('AuthToken', authToken);
        res.cookie('UserInfo', user);
		res.send("Logged in");
	}
	else{
		return res.status(400).send([userEmail, " Invalid username or password. "])
	}
});

app.get('/api/logout', function(req, res) {
    let appCookies = req.cookies;
    for (var prop in appCookies) {
        if (!appCookies.hasOwnProperty(prop)) {
            continue;
        }    
        res.cookie(prop, '', {expires: new Date(0)}); //set cookie to some old date
    }
	
    return res.send("Logged out");
});

app.get("/api/user", authMiddleware, (req, res) => {
	
	let user = users.find(u => u.id === req.user.id);
	 
	let {currency, currencySymbol} = countryLocalCurrency(user.country); 
	 
	let userInfo = {...user, 'currency':currency, 'currencySymbol':currencySymbol}; 
	delete userInfo.userPassword;
	res.send({user: userInfo});  
});  

app.get('/api/cryptocurrencies', function(req, res){
	
	let defaultClient = BlockchainComExchangeRestApi.ApiClient.instance;
	// Configure API key authorization: ApiKeyAuth
	let ApiKeyAuth = defaultClient.authentications['ApiKeyAuth'];
	ApiKeyAuth.apiKey = '8fa427c3-fb4e-4a99-8d9d-0d361f90501e';
	//set a prefix for the API key, e.g. "Token" (defaults to null)
	ApiKeyAuth.apiKeyPrefix = 'Token';
	
	
	let apiInstance = new BlockchainComExchangeRestApi.UnauthenticatedApi();
	
	
	var cryptoC, cryptoSymbol;
	var cryptoCurrencies = [];
	
	apiInstance.getTickers((error, data, response) => {
		  if (error) {
			console.error(error);
		  } else {
								
			let {currency, currencySymbol} = countryLocalCurrency(req.user.country);
										
			let currencyConverter = new CC({from:"USD", to:currency, amount:1});
			
			   
			currencyConverter.convert().then((response) => { //convert the crypto currency's price to the local currency of user
								let rateUSD = response; 
								
								data.forEach(function(item, index){
										cryptoSymbol = data[index].symbol; //get currency conversion symbol
										cryptoC = cryptoSymbol.split('-'); 
										
										if(cryptoC[1] === 'USD'){ //get prices of all crypto currencies in USD
											
											cryptoCurrencies.push({
												cryptoCurrency: (nameOf(cryptoC[0]) !== undefined) ? nameOf(cryptoC[0]) + ' (' + cryptoC[0] +')' : cryptoC[0], 
												icon: cryptoC[0].toLowerCase(), 
												price_24h:  rateUSD*data[index].price_24h || data[index].price_24h, //convert to local currency
												volume_24h: data[index].volume_24h,
												last_trade_price: rateUSD*data[index].last_trade_price || data[index].last_trade_price //convert to local currency
												}); 
											
										}   
									} ); 
									
									res.send({cryptoData: cryptoCurrencies});  
							});
							
							   
		  }
		});
	
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
