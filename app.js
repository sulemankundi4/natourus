const express = require('express');
const morgan = require('morgan');
const AppError = require('./utils/appErrors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const sanitization = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const viewRouter = require('./routes/viewRouter');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');

const globalErrorHandler = require('./controller/errorController');
// const errors = require('eslint-plugin-import/config/errors');

const app = express();
app.use(express.json());
app.use(cookieParser());
//Below is the middleware to set the view engine to pug
app.set('view engine', 'pug');
app.set('views', `${__dirname}/views`);

//middle to access the statis file in our prokect
//Baiscally static file are html css and images etc
app.use(express.static('./public'));
//3rd Party middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// app.use(helmet());

//Rate limiting global middleware
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 60 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'request limit exceeded try again later',
});
app.use('/api', limiter);

//Data sanitization against nosql query injections
//This middleware will sanitize the quaries
app.use(sanitization());

//this will block html code from renfering in dabase
//will replace tags with irregular expressions
app.use(xss());

//this hpp (http parameter pollution) will not allow multiple same paramters
//but in some case we may need that for that we can whitelist some of them
app.use(
  hpp({
    whitelist: [
      'duration',
      'duration',
      'difficulty',
      'ratingsAverage',
      'ratingsQuantity',
      'price',
    ],
  }),
);

//Below is the custom middleware i create
//each middleware has access to the req and res and next
//always call the next function to move req/res cycle forward
//Otherwise the middleware will stuck
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.headers);
  next();
});

//when we hit any url below the specif router object will be called and will complete
//Request response cycle i.e mounting routes
app.use('/', viewRouter);
app.use(`/api/v1/tours`, tourRouter);
app.use(`/api/v1/users`, userRouter);
app.use(`/api/v1/reviews`, reviewRouter);

//This middleware will be executed if none of above routers was not able to catch the
//request that simply mean that rounte was not found so we have to return erroe here in json

app.all('*', (req, res, next) => {
  next(
    new AppError(`That route ${req.originalUrl} was not found on server!`, 404),
  );
});

//Below is the gloabal error handling middleware when we pass 4 params to middleware
//express recognize it as gloabl error handling middleware
//THis middleware will caught all the error in express in case if exixst so that great
app.use(globalErrorHandler);

module.exports = app;
