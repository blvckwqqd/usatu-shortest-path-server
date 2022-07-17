const { dbquery } = require('./database');
const proj4 = require('proj4');

const getRoute =  async (req, res) => {
  const {startRoom, endRoom} = req.query;
  const startRoomCampus = startRoom.split('-')[0];
  const startRoomNum = startRoom.split('-')[1];
  const endRoomCampus = endRoom.split('-')[0];
  const endRoomNum = endRoom.split('-')[1];
    try {
      const startRoomQuery = await dbquery(`SELECT  floor, number, type, campus, department,
      ST_asGeoJSON(st_centroid(wkb_geometry))
      AS geom FROM geodata.search_rooms_v
      WHERE number LIKE '${startRoomNum}'::text AND campus = ${startRoomCampus}::integer;`);

      //console.log(startRoomQuery);

      const endRoomQuery = await dbquery(`SELECT  floor, number, type, campus, department,
      ST_asGeoJSON(st_centroid(wkb_geometry))
      AS geom FROM geodata.search_rooms_v
      WHERE number LIKE '${endRoomNum}'::text AND campus = ${endRoomCampus}::integer;`);

      //console.log(endRoomQuery);

      const closestStartNode = await dbquery(`SELECT
      verts.id as id
      FROM geodata.networklines_vertices_pgr AS verts
      INNER JOIN
        (select ST_PointFromText('POINT(${JSON.parse(startRoomQuery[0].geom).coordinates[0]} 
        ${JSON.parse(startRoomQuery[0].geom).coordinates[1]} 
        ${startRoomQuery[0].floor*10})', 3857)as geom) AS pt
      ON ST_DWithin(verts.the_geom, pt.geom, 10.0)
      ORDER BY ST_3DDistance(verts.the_geom, pt.geom)
      LIMIT 1;`);
      //console.log(closestStartNode);

      const closestEndNode = await dbquery(`SELECT
      verts.id as id
      FROM geodata.networklines_vertices_pgr AS verts
      INNER JOIN
        (select ST_PointFromText('POINT(${JSON.parse(endRoomQuery[0].geom).coordinates[0]} 
        ${JSON.parse(endRoomQuery[0].geom).coordinates[1]} 
        ${endRoomQuery[0].floor*10})', 3857)as geom) AS pt
      ON ST_DWithin(verts.the_geom, pt.geom, 10.0)
      ORDER BY ST_3DDistance(verts.the_geom, pt.geom)
      LIMIT 1;`);
      //console.log(closestEndNode);
  
      const routeQuery = await dbquery(`SELECT seq, node, edge, ST_Length(wkb_geometry) AS cost, layer,
      type_id, ST_AsGeoJSON(wkb_geometry) AS geoj
      FROM pgr_dijkstra(
        'SELECT ogc_fid as id, source, target, st_length(wkb_geometry) AS cost,
        layer, type_id
        FROM geodata.networklines',
        ${closestStartNode[0].id}, ${closestEndNode[0].id}, FALSE
      ) AS dij_route
      JOIN  geodata.networklines AS input_network
      ON dij_route.edge = input_network.ogc_fid ;`);

      const geojson = {
        "type": "FeatureCollection",
        "features": []
      }
      for (rows in routeQuery){
        let temp = JSON.parse(routeQuery[rows].geoj);
        let toGeoj = {
          "type": "",
        "geometry": {
          "type": "",
          "crs": {
            "type": "",
            "properties": {
              "name": ""
            }
          },
          "coordinates": []
        },
        "properties": {
          "floor": 0,
          "cost": 0,
          "type_id": 0
        }
        };
        toGeoj['type'] = "Feature";
        toGeoj['geometry']['type'] = temp['type'];
        toGeoj['geometry']['crs']['type'] = temp['crs']['type'];
        toGeoj['geometry']['crs']['properties']['name'] = temp['crs']['properties']['name'];
        for (let i = 0 ;i< temp['coordinates'].length; i++){
          toGeoj['geometry']['coordinates'][i] = proj4('EPSG:3857', 'EPSG:4326', temp['coordinates'][i]);
        }
        toGeoj['properties']['floor'] = routeQuery[rows].layer;
        toGeoj['properties']['cost'] = routeQuery[rows].cost;
        toGeoj['properties']['type_id'] = routeQuery[rows].type_id;
        geojson['features'].push(toGeoj);
      }
      res.status(200).json(geojson);
    } catch(error){
      res.status(200).json(error);
    }
    

};

const getAllFromTable = async (req, res) => {
  try {
    const {tableName} = req.query;
    const query = `SELECT * FROM geodata.${tableName};`;
    const queryResult = await dbquery(query);
    res.status(200).json(queryResult);
  } catch (error) {
    res.status(200).json(erorr);
  }
    
};

const getNodeId = async (req, res) => {
  try {
    const {x,y,z} = req.query;
    const query = `SELECT id FROM geodata.networklines_vertices_pgr AS p
    WHERE ST_DWithin(the_geom, ST_GeomFromText('POINT(${x} ${y})',3857), 1)
    AND ST_Z(the_geom) = ${z};`;
    const queryResult = await dbquery(query);
    res.status(200).json(queryResult);
  } catch (error) {
    res.status(200).json(erorr);
  }
    
};

const getRoomCloseNode = async (req, res) => {
  try {
    const {c, num} = req.query;
    const query = `SELECT  floor, number, type, campus,department,
    ST_asGeoJSON(st_centroid(wkb_geometry))
    AS geom FROM geodata.search_rooms_v
    WHERE number = ${num}::text AND campus = ${c}::integer;`;
    const queryResult = await dbquery(query);
    res.status(200).json(queryResult);
  } catch (error) {
    res.status(200).json(error);
  } 
};

const getRoomsFromCampus = async (req, res) => {
  try {
    const {campus} = req.query;
    const query = `SELECT  floor, number, type, campus, department
    FROM geodata.search_rooms_v
    WHERE campus = ${campus}::integer
    ORDER BY floor DESC;`;
    const queryResult = await dbquery(query);
    res.status(200).json(queryResult);
  } catch (error) {
    res.status(200).json(error);
  }
};

const getRoomsFromCampusFloor = async (req, res) => {
  try {
    const {campus, floor} = req.query;
    const query = `SELECT  number
    FROM geodata.search_rooms_v
    WHERE campus = ${campus}::integer AND floor = ${floor}::integer AND number IS NOT NULL
    ORDER BY number ASC;`;
    const queryResult = await dbquery(query);
    res.status(200).json(queryResult);
  } catch (error) {
    res.status(200).json(error);
  }
};

const getCampuses = async (req, res) => {
  try {
    const query = `SELECT DISTINCT campus FROM geodata.search_rooms_v; `;
    const queryResult = await dbquery(query);
    res.status(200).json(queryResult);
  } catch (error) {
    res.status(200).json(error);
  }
};

const getCampusFloors = async (req, res) => {
  try {
    const {campus} = req.query;
    const query = `SELECT DISTINCT floor FROM geodata.search_rooms_v
    WHERE campus = ${campus}
    ORDER BY floor ASC;`;
    const queryResult = await dbquery(query);
    res.status(200).json(queryResult);
  } catch (error) {
    res.status(200).json(error);
  }
}

const getRouteToToilet =  async (req, res) => {
  const {startRoom, sex} = req.query;
  const startRoomCampus = startRoom.split('-')[0];
  const startRoomNum = startRoom.split('-')[1];

  try {
    const startRoomQuery = await dbquery(`SELECT  floor, number, type, campus, department, wkb_geometry,
      ST_asGeoJSON(st_centroid(wkb_geometry))
      AS geom FROM geodata.search_rooms_v
      WHERE number LIKE '${startRoomNum}'::text AND campus = ${startRoomCampus}::integer;`);
      
    //console.log(startRoomQuery)

    const toiletQuery = await dbquery(`SELECT  floor, number, type, campus, department, wkb_geometry,
    ST_asGeoJSON(ST_centroid(wkb_geometry))
    AS geom FROM geodata.search_rooms_v
    WHERE type ~* 'туалет ${sex}'::text
    ORDER BY ST_3DDistance(wkb_geometry, ST_PointFromText('POINT(${JSON.parse(startRoomQuery[0].geom).coordinates[0]} 
    ${JSON.parse(startRoomQuery[0].geom).coordinates[1]} 
    ${startRoomQuery[0].floor*10})', 3857));`);

    //console.log(toiletQuery);

    const closestStartNode = await dbquery(`SELECT
    verts.id as id
    FROM geodata.networklines_vertices_pgr AS verts
    INNER JOIN
      (select ST_PointFromText('POINT(${JSON.parse(startRoomQuery[0].geom).coordinates[0]} 
      ${JSON.parse(startRoomQuery[0].geom).coordinates[1]} 
      ${startRoomQuery[0].floor*10})', 3857)as geom) AS pt
    ON ST_DWithin(verts.the_geom, pt.geom, 10.0)
    ORDER BY ST_3DDistance(verts.the_geom, pt.geom)
    LIMIT 1;`);

    const closestToiletNode = await dbquery(`SELECT
    verts.id as id
    FROM geodata.networklines_vertices_pgr AS verts
    INNER JOIN
      (select ST_PointFromText('POINT(${JSON.parse(toiletQuery[0].geom).coordinates[0]} 
      ${JSON.parse(toiletQuery[0].geom).coordinates[1]} 
      ${toiletQuery[0].floor*10})', 3857)as geom) AS pt
    ON ST_DWithin(verts.the_geom, pt.geom, 10.0)
    ORDER BY ST_3DDistance(verts.the_geom, pt.geom)
    LIMIT 1;`);

    //console.log(closestToiletNode);

  
    const routeQuery = await dbquery(`SELECT seq, node, edge, ST_Length(wkb_geometry) AS cost, layer,
      type_id, ST_AsGeoJSON(wkb_geometry) AS geoj
      FROM pgr_dijkstra(
        'SELECT ogc_fid as id, source, target, st_length(wkb_geometry) AS cost,
        layer, type_id
        FROM geodata.networklines',
        ${closestStartNode[0].id}, ${closestToiletNode[0].id}, FALSE
      ) AS dij_route
      JOIN  geodata.networklines AS input_network
      ON dij_route.edge = input_network.ogc_fid ;`);

      const geojson = {
        "type": "FeatureCollection",
        "features": []
      }
      for (rows in routeQuery){
        let temp = JSON.parse(routeQuery[rows].geoj);
        let toGeoj = {
          "type": "",
        "geometry": {
          "type": "",
          "crs": {
            "type": "",
            "properties": {
              "name": ""
            }
          },
          "coordinates": []
        },
        "properties": {
          "floor": 0,
          "cost": 0,
          "type_id": 0
        }
        };
        toGeoj['type'] = "Feature";
        toGeoj['geometry']['type'] = temp['type'];
        toGeoj['geometry']['crs']['type'] = temp['crs']['type'];
        toGeoj['geometry']['crs']['properties']['name'] = temp['crs']['properties']['name'];
        for (let i = 0 ;i< temp['coordinates'].length; i++){
          toGeoj['geometry']['coordinates'][i] = proj4('EPSG:3857', 'EPSG:4326', temp['coordinates'][i]);
        }
        toGeoj['properties']['floor'] = routeQuery[rows].layer;
        toGeoj['properties']['cost'] = routeQuery[rows].cost;
        toGeoj['properties']['type_id'] = routeQuery[rows].type_id;
        geojson['features'].push(toGeoj);
      }
      res.status(200).json(geojson);
    } catch(error){
      res.status(200).json(error);
    }
};

module.exports = {
    getAllFromTable,
    getNodeId,
    getRoute,
    getRouteToToilet,
    getRoomCloseNode,
    getRoomsFromCampus,
    getCampuses,
    getRoomsFromCampusFloor,
    getCampusFloors
};