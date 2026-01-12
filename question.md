{
  "completed_at": "2025-10-08T09:11:14.121235Z",
  "created_at": "2025-10-08T09:05:03.049000Z",
  "data_removed": false,
  "error": null,
  "id": "ewbbne8y95rge0csrc8sdn0qxr",
  "input": {
    "images": [
      "https://replicate.delivery/pbxt/NqKIgWflm2NVvlBpLwR3rSlNKogFLy0VGwGI9apml3mtJEUy/0-1.jpg"
    ],
    "return_pcd": false,
    "return_depth": true
  },
  "logs": "Received 1 images.\nRunning inference...\nInference done!\nPostprocessing the results...\nDumping data to 1 JSON files...\nDumped 1 JSON files!\nDumping depth data into PNG files...\nDumped 1 PNG files!\nPostprocessed the results!",
  "metrics": {
    "predict_time": 4.835667571,
    "total_time": 371.072235
  },
  "output": {
    "data": [
      "https://replicate.delivery/czjl/Lnsa8Tb8R0KQHRR9oJEHp75RVlR7YsVM0kss4Po3ORSscPXF/image_0001.json"
    ],
    "point_cloud": null,
    "depth_images": [
      "https://replicate.delivery/czjl/ZFlTJ7SC5rpfVaMHPW3YFaR7seufzntdCuahavITpkzil75qA/image_0001.png"
    ]
  },
  "started_at": "2025-10-08T09:11:09.285568Z",
  "status": "succeeded",
  "urls": {
    "get": "https://api.replicate.com/v1/predictions/ewbbne8y95rge0csrc8sdn0qxr",
    "cancel": "https://api.replicate.com/v1/predictions/ewbbne8y95rge0csrc8sdn0qxr/cancel"
  },
  "version": "0387a23b348b11120cbb66dc34270fc9cbfa0a21945305a3900d88ae2c45fc99"
}