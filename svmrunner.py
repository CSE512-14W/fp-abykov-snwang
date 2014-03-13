import random

import numpy as np
from sklearn import datasets
from sklearn import preprocessing
from sklearn import svm

def convertToQuantitative(y):
  copy = y.copy()
  copy[copy == "RB"] = "1"
  copy[copy == "NRB"] = "-1"
  return copy.astype(int)

def convertToNominal(y):
  copy = y.astype(str)
  copy[copy == "1"] = "RB"
  copy[copy == "-1"] = "NRB"
  return copy

def iterations():
  X_train = np.genfromtxt("data/biodeg-train.csv", delimiter=",", usecols=tuple(xrange(41)))
  y_train = np.genfromtxt("data/biodeg-train.csv", delimiter=",", dtype=None, usecols=41)
  X_validation = np.genfromtxt("data/biodeg-validation.csv", delimiter=",", usecols=tuple(xrange(41)))
  y_validation = np.genfromtxt("data/biodeg-validation.csv", delimiter=",", dtype=None, usecols=41)
  X_test = np.genfromtxt("data/biodeg-test.csv", delimiter=",", usecols=tuple(xrange(41)))
  y_test = np.genfromtxt("data/biodeg-test.csv", delimiter=",", dtype=None, usecols=41)

  y_train = convertToQuantitative(y_train)
  y_validation = convertToQuantitative(y_validation)
  y_test = convertToQuantitative(y_test)

  scaler = preprocessing.StandardScaler().fit(X_train)
  X_train_scaled = scaler.transform(X_train)
  X_validation_scaled = scaler.transform(X_validation)
  X_test_scaled = scaler.transform(X_test)

  prev_coef = None
  i = 1
  num_examples = len(X_train_scaled)
  while True:
      svc = svm.SVC(kernel='linear', verbose=True, max_iter=i)
      res = svc.fit(X_train_scaled, y_train)
      coef = np.concatenate((np.array([res.intercept_[0]]), res.coef_[0]))
      if i > 1 and np.allclose(coef, prev_coef, rtol=0., atol=1e-6):
          break
      prev_coef = coef

      train_accuracy = res.score(X_train_scaled, y_train)
      validation_accuracy = res.score(X_validation_scaled, y_validation)
      test_accuracy = res.score(X_test_scaled, y_test)
      yield i, list(coef), num_examples * (1 - train_accuracy), train_accuracy, validation_accuracy, test_accuracy

      i += 1
  print len(coefs)
