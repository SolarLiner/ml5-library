// Copyright (c) 2018 ml5
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

/*
Image classifier class based on ImageNet trained models.
SqueezeNet and MobileNet supported.
*/


import * as tf from '@tensorflow/tfjs';
import { IMAGENET_CLASSES } from './../utils/IMAGENET_CLASSES';
import { processVideo } from '../utils/imageUtilities';

class ImageClassifier {
  constructor() {
    this.net = null;
    this.imageSize = 224;
    this.modelPath = 'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json';
    this.topKPredictions = 10;
    this.modelLoaded = false;
    this.video = null;
  }

  async predict(input, num, callback) {
    if (input instanceof HTMLVideoElement && !this.video) {
      this.video = processVideo(input, '127');
    }

    if (!this.modelLoaded) {
      this.net = await tf.loadModel(this.modelPath);
      // Warm up the model
      this.net.predict(tf.zeros([1, this.imageSize, this.topKPredictions, 3])).dispose(); 
      this.modelLoaded = true;
    }
    // Wait until the net has been loaded
    await this.net;

    if (this.video) {
      if (this.video.src) {
        return this.getClasses(this.video, num, callback);
      }
    }

    const logits = tf.tidy(() => {
      const img = tf.fromPixels(input).toFloat();
      const offset = tf.scalar(127.5);
      const normalized = img.sub(offset).div(offset);
      const batched = normalized.reshape([1, this.imageSize, this.imageSize, 3]);
      return mobilenet.predict(batched);
    });

    await this.getTopKClasses(logits, this.topKPredictions, callback);
  }

  // Private Method
  async getTopKClasses(logits, topK, callback) {
    const values = await logits.data();
    const valuesAndIndices = [];
    for (let i = 0; i < values.length; i += 1) {
      valuesAndIndices.push({ value: values[i], index: i });
    }
    valuesAndIndices.sort((a, b) => b.value - a.value);
    const topkValues = new Float32Array(this.topK);
    const topkIndices = new Int32Array(topK);
    for (let i = 0; i < topK; i += 1) {
      topkValues[i] = valuesAndIndices[i].value;
      topkIndices[i] = valuesAndIndices[i].index;
    }
    const topClassesAndProbs = [];
    for (let i = 0; i < topkIndices.length; i += 1) {
      topClassesAndProbs.push({
        className: IMAGENET_CLASSES[topkIndices[i]],
        probability: topkValues[i],
      });
    }
    if (callback) {
      callback(topClassesAndProbs);
    }
    return topClassesAndProbs;
  }
}

export default ImageClassifier;
