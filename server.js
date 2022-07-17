const express = require('express')
const bodyParser = require('body-parser')
const db = require('./src/queries')

const app = express()
const port = 3000

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.get('/api', (request, response) => {
  response.send("Добро пожаловать на серверную часть дипломного проекта "+
  "Митина и Мишагина под названием 'Навигатор УГАТУ'")
});

app.get('/api/getAllFromTable', db.getAllFromTable);

app.get('/api/getNodeId', db.getNodeId);

app.get('/api/getRoomCloseNode', db.getRoomCloseNode);

app.get('/api/getRoute',db.getRoute);

app.get('/api/getRouteToToilet',db.getRouteToToilet);

app.get('/api/getRooms',db.getRoomsFromCampus);

app.get('/api/getFloorRooms',db.getRoomsFromCampusFloor);

app.get('/api/getCampuses',db.getCampuses);

app.get('/api/getCampusFloor',db.getCampusFloors);



app.listen(port, () => {
  console.log(`App running on port ${port}.`)
});



