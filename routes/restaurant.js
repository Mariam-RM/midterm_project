"use strict";

const express = require('express');
const router  = express.Router();
const accountSid = 'AC179754f7af01989ecab3b52a6b9755be';
const authToken = '913da9bf2a42df203863cd3644ca928f';
const client = require('twilio')(accountSid, authToken);

module.exports = (knex) => {

  //route to get to restaurant login page (where redirected to if trying to access other page without logging in) STRETCH
  //RENDER Restaurant login page
  router.get("/", (req,res)=>{
    res.render("restaurant");
    //res.send("sent to restaurant 'login' page - ejs not ready yet.")
  });

  //RENDER order summary page for restaurant
  router.get("/summary", (req,res)=>{
    //console.log("orderid results:", orderIdArr);

    //SQL query from order# details:
    //SELECT * FROM "ordersFoods"
    //JOIN foods ON "ordersFoods".foodid=foods.foodid
    //JOIN orders ON orders.orderid="ordersFoods".orderid
    //JOIN clients ON clients.clientid=orders.clientid;

    knex.select('orders.orderid', 'clients.name as cname', 'clients.phone_number', 'foods.foodid', 'foods.name', 'food_quantity', 'completed')
      .from('ordersFoods')
      .join('foods', 'ordersFoods.foodid', '=', 'foods.foodid')
      .join('orders', 'ordersFoods.orderid', '=', 'orders.orderid')
      .join('clients', 'clients.clientid', '=', 'orders.clientid')
      //.whereIn('orderid', orderIdArr)
      .then( (orders) => {

        //create an Object {orderid: [{food data},{food data},...] }
        let groupedObjects = {};
        for(let i in orders) {

          if( groupedObjects[orders[i]['orderid']] ){
            groupedObjects[orders[i]['orderid']].push(orders[i]);
          }
          else {
            groupedObjects[orders[i]['orderid']] = [orders[i]];
          }
        }
        //console.log("temp:", groupedObjects);
        res.render("restaurant_summary", {orders:groupedObjects});
      })
      .catch((err) => {
        console.log("Error @query for foods:", err);
      });

  });

  router.post("/", (req, res) => {
    try{
      res.redirect("/restaurant/summary");
    } catch (err) {
      console.log("Error @Post restaurant login:", err);
    }
  });

  //Send SMS with prep time
  router.post("/summary", (req, res) => {
    try{
      let orderId = req.body.sms_orderid;
      let prepTime = req.body.prep_time
      let orderUpdate = {
        completed: 1,
        prep_time: prepTime
      };

      client.messages.create(
      {
        body: `Your order (#${orderId}) will be complete in ${prepTime} minutes.`,
        from: '+16475594746',
        to: '+16475049239'
      }).then(message => console.log(message.sid)).done();

      //Set the order as 'completed' so sms is sent
      knex('orders').where('orderid', '=', orderId).update(orderUpdate)
        .then( () => {
          res.redirect("/restaurant/summary");
        })


    } catch (err) {
      console.log("Error @Post restaurant/summary:", err);
    }

  });

  return router;
}
