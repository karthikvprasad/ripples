const express = require('express');
const bodyParser= require('body-parser');
const app = express();
const MongoClient = require('mongodb').MongoClient

app.set('view engine', 'ejs');
var db;

MongoClient.connect('mongodb://localhost:27017/ripples', function(err, database) {
  if (err) 
    return console.log(err);
  db = database;
  app.listen(3000, function() {
    console.log('listening on 3000');
  })
})

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.get('/', function(req, res) {
   db.collection('trip').find().sort({_id:1}).toArray(function(err, result) {
		    if (err) 
          return console.log(err);
		    res.render('index.ejs', {trips: result});
});
});

app.post('/requestCar', function(req, res) {
	console.log("req",req.body);
	if(req.body.isPink=='on'){
		req.body.isPink=true;
	} else{
		req.body.isPink=false;
	}
	console.log('after',req.body);
  db.collection('cabs').find({status:'free'}).toArray(function(err, result) {
    if (err){ 
      return res.send('All cabs are busy');
    }
      else{
        console.log('result',result);
        var min = 0;
        var index = 0;
        var cab = {};
        for(var i=0; i<result.length; i++){
          var sum = result.ops[i].latitude + result.ops[i].longitude;
          if(min > sum){
            min = sum;
            index = i;
          }
          cab = result.ops[index];
        }        
        setTimeout(function(){
          req.body.driverId = cab.driverId ? cab.driverId : 1;
          db.collection('trip').save(req.body, function(err, resp) {
                  if (err){ 
                    return res.send('ride unsuccessfull');
                  }
                    else{
                      console.log('result',result);                      
                      var resData={};
                      var a=Math.pow(resp.ops[0].latitude,2)+Math.pow(resp.ops[0].latitude,2);
                      var distace=Math.sqrt(a);
                      resData.success='true';
                      resData.distance=distace;
                      resData.tripId=resp.ops[0]._id;
                      resData.driverId=resp.ops[0].driverId;
                      res.send(resData);
                    }
                });
        },2000);
      }

   })
   
  });

app.post('/startTrip', function(req, res) {
	console.log('request',req.body);
   db.collection('trip').findOneAndUpdate({userId:req.query.userId, driverId:req.query.driverId},{$set:{startTime:new Date()}}, function(err, result) {
    if (err){
     return res.send({success:false, message:err});
    }
    	else{
    		console.log('update result',result);
        db.collection('cabs').save({driverId:req.query.driverId},{$set:{status:'occupied'}}, function(err, result){});
    		var resData={};
    		resData.success='true';
    		res.send(resData);
    	}

  });
});

app.post('/stopTrip', function(req, res) {
	console.log('request',req.body);
	var stoptime=new Date().getTime();

   db.collection('trip').findOneAndUpdate({userId:req.query.userId},{$set:{latitude:req.body.latitude,longitude:req.body.longitude,stopTrip:stoptime}}, function(err, result) {
    if (err){
     return console.log(err);
 }
    	else{
    	 db.collection('trip').findOneAndUpdate({userId:req.query.userId},{$unset:{startTime:null, driverId:null}}, function(err, result) {
	
    		
    		console.log('update result',result);
        db.collection('cabs').save({driverId:req.query.driverId},{$set:{status:'free'}}, function(err, result){});
    		var resData={};
    		var a=Math.pow(req.body.latitude,2)+Math.pow(req.body.longitude,2);
    		var distace=Math.sqrt(a);        
    		var timeElapsed=(stoptime-result.value.startTime)/1000;
    		if(result.value.isPink){
    			resData.pinkCharge=5
    			tripFare=2*distace+1*(Math.floor(timeElapsed / 60)+resData.pinkCharge);
    		}	
	    	else{
	    		resData.pinkCharge=0;
	    		tripFare=2*distace+1*(Math.floor(timeElapsed / 60));
	    	}

    		resData.success='true';
    		resData.tripFare=tripFare;
    		resData.timeElapsed=timeElapsed;
    		resData.distance=distace;
    		resData.tripId=result.value._id;
    		res.send(resData);
    	});
    	}

  });
});


