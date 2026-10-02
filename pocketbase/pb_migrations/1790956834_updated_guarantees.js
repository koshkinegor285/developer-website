/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1844327653")

  // update collection data
  unmarshal({
    "name": "garantii"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1844327653")

  // update collection data
  unmarshal({
    "name": "guarantees"
  }, collection)

  return app.save(collection)
})
