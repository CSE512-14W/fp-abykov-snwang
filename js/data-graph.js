// Partition the visualization space.
var margin = {top: 50, right: 30, bottom: 20, left: 30, between:20},
    width = 1280 - margin.left - margin.right,
    height = 800 - margin.top - margin.bottom,
    topHeight = Math.round(height * 0.7),
    botHeight = height - topHeight;

var fullChart = d3.select("body")
                  .append("svg")
                  .attr("width", width + margin.left + margin.right)
                  .attr("height", height + margin.top + margin.bottom);

// Add a title
var title = fullChart.append("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top / 3 + ")")
title.append("text")
     .text("Visualizing an SVM classifier")
     .style("font-family", "Arial Black")
     .style("font-size", "18px")
     .style("visibility", "hidden");
var titleWidth = title.select("text").node().getComputedTextLength();
title.select("text")
     .attr("x", width / 2 - titleWidth / 2)
     .attr("y", margin.top / 5)
     .style("visibility", "visible");
                  
var plot = fullChart.append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
var bottom = fullChart.append("g").attr("transform", "translate(" + margin.left + "," + (topHeight + margin.top + margin.between) + ")");
                    
// The padding for the axes
var axesPadding = 40;

// The padding for the axes labels
var labelPadding = 0;

// The padding between data points and axes
var dataPaddingPercentage = 0.02;
                    
// Load in all of the data
queue()
  .defer(d3.text, "data/biodeg-train.csv")
  .defer(d3.text, "data/biodeg-validation.csv")
  .defer(d3.text, "data/biodeg-test.csv")
  .defer(d3.text, "data/biodeg-features.txt")
  .defer(d3.text, "data/biodeg-w.csv")
  .defer(d3.text, "data/biodeg-errors.csv")
  .defer(d3.text, "data/biodeg-train-accuracies.csv")
  .defer(d3.text, "data/biodeg-validation-accuracies.csv")
  .defer(d3.text, "data/biodeg-test-accuracies.csv")
  .defer(d3.text, "data/biodeg-classes.txt")
  .await(drawElements);
  

function calculateDatasetProperties(data, numDim) {
  // To make life easier for us later we can compute the min, max, mean and std of each dimension here
  var featureMins = new Array(numDim);
  var featureMaxs = new Array(numDim);
  var featureMeans = new Array(numDim);
  var featureStds = new Array(numDim);
   
  // Initialize everything
  for (var i = 0; i < numDim; i++) {
    featureMins[i] = data[0][i];
    featureMaxs[i] = data[0][i];
    featureMeans[i] = 0;
    featureStds[i] = 0;
  }
   
  for (var i = 0; i < data.length; i++) {
    for (var j = 0; j < numDim; j++) {
      var val = parseFloat(data[i][j]);
      data[i][j] = val;
      featureMeans[j] += val;
      if (val < featureMins[j]) {
        featureMins[j] = val;
      }
      if (val > featureMaxs[j]) {
        featureMaxs[j] = val;
      }
    }
  }
  
  // Compute the means
  for (var i = 0; i < numDim; i++) {
    featureMeans[i] /= data.length;
  }
  
  // We need one more pass through the data to calculate the std
  for (var i = 0; i < data.length; i++) {
    for (var j = 0; j < numDim; j++) {
      var diff = data[i][j] - featureMeans[j];
      featureStds[j] += diff * diff;
    }
  }
  
  for (var i = 0; i < numDim; i++) {
    featureStds[i] /= (data.length - 1);
    featureStds[i] = Math.sqrt(featureStds[i]);
  }
  
  var dataMeasures = {mins:featureMins, maxs:featureMaxs, means:featureMeans, stds:featureStds};
  return dataMeasures;
}
 
function fitText(text, maxWidth) {
  var textLabel = plot.append("g");
  textLabel.append("text")
           .text(text)
           .attr("class", "label")
           .style("visibility", "hidden");
  var textWidth = textLabel.select("text").node().getComputedTextLength();
  
  var addEllipses = false;
  
  while (textWidth > maxWidth) {
    addEllipses = true;
    text = text.slice(0, text.length - 1);
    textLabel.select("text")
             .text(text + "...");
    textWidth = textLabel.select("text").node().getComputedTextLength();
  }
  
  return addEllipses ? text + "..." : text;
}
 
function drawCross(x, y, radius) {
  return "M " + (x - radius) + " " + (y + radius) 
      + " L " + (x + radius) + " " + (y - radius)
      + " M " + (x - radius) + " " + (y - radius) 
      + " L " + (x + radius) + " " + (y + radius);
}
var updateVisualization = function () {};
  
function drawElements(err, unparsedTrainData, unparsedValidationData, 
    unparsedTestData, unparsedFeatureNames, unparsedWeightVectors, 
    unparsedErrors, unparsedTrainAccuracies, unparsedValidationAccuracies, 
    unparsedTestAccuracies, unparsedClassNames) {
    
  var parsedTrainData = d3.csv.parseRows(unparsedTrainData);
  var parsedValidationData = d3.csv.parseRows(unparsedValidationData);
  var parsedTestData = d3.csv.parseRows(unparsedTestData);
  
  var featureNames = d3.csv.parseRows(unparsedFeatureNames);
  //var errors = d3.csv.parseRows(unparsedErrors).map(function (x) {
    //return Math.round(parseFloat(x[0]));
  //});
  //var trainAccuracies = d3.csv.parseRows(unparsedTrainAccuracies).map(function (x) {
    //return parseFloat(x[0]);
  //});
  //var validationAccuracies = d3.csv.parseRows(unparsedValidationAccuracies).map(function (x) {
    //return parseFloat(x[0]);
  //});
  //var testAccuracies = d3.csv.parseRows(unparsedTestAccuracies).map(function (x) {
    //return parseFloat(x[0]);
  //});
  //var weightVectors = d3.csv.parseRows(unparsedWeightVectors);
  var classes = d3.csv.parseRows(unparsedClassNames);

  //var errorDeltas = new Array(errors.length);
  //errorDeltas[0] = 0;
  //for (var i = 1; i < errors.length; i++) {
    //errorDeltas[i] = errors[i] - errors[i-1];
  //}
  trainAccuracies = [0.5];
  validationAccuracies = [0.5];
  testAccuracies = [0.5];
  weightVectors = [[]];
  for (var i = 0; i < parsedTrainData.length; i++)
    weightVectors[0][i] = Math.random()*2 - 1;
  //weightVectors = weightVectors[0];
  errors = [0.5 * parsedTrainData.length];
  errorDeltas = [0];

  updateVisualization = function (iterationData) {
    var i = iterationData[0],
        w = iterationData[1],
        numErrors = iterationData[2],
        trainAccuracy = iterationData[3],
        validationAccuracy = iterationData[4],
        testAccuracy = iterationData[5];
    weightVectors.push(w);
    errorDeltas.push(numErrors - errors[errors.length - 1]);
    errors.push(numErrors);
    trainAccuracies.push(trainAccuracy);
    validationAccuracies.push(validationAccuracy);
    testAccuracies.push(testAccuracy);
    drawDist(timeSeriesTypes[currentTimeSeries]);
  };
  
  var numDim = parsedTrainData[0].length - 1;
  var trainDataMeasures = calculateDatasetProperties(parsedTrainData, numDim);
  var validationDataMeasures = calculateDatasetProperties(parsedValidationData, numDim);
  var testDataMeasures = calculateDatasetProperties(parsedTestData, numDim);
  
  // It is helpful to calculate the length of the longest feature text here
  var longestFeatureWidth = 0;
  var hiddenText = plot.append("text")
                       .style("visibility", "hidden");
   
  for (var i = 0; i < numDim; i++) {
    hiddenText.text(featureNames[i][0])
              .attr("class", "label");
    var featureWidth = hiddenText.node().getComputedTextLength();
    
    if (featureWidth > longestFeatureWidth) {
      longestFeatureWidth = featureWidth;
    }
  }
   
  // Plot the rectangle behind the actual plot
  var fullPlotWidth = width - axesPadding - labelPadding;
  var fullPlotHeight = topHeight - axesPadding - labelPadding;
  
  // Create a new group for plotting the points, axes, etc.
  var plotGroupParent = plot.append("g");
  var plotGroup;
  var xScale;
  var yScale;
  var correctPointsGroup;
  var mistakePointsGroup;
  
  // Constants necessary for the axes labels
  var textHeight = 12;
  var rectLabelPadding = 2;
  var selectedAxis = -1;
  var selectedFeatureIndex = -1;
  var currentIndex = 0;
  var currentTimeSeries = 0;
  var tsDatasets = [parsedTrainData, parsedTrainData, parsedTrainData, parsedValidationData, parsedTestData];
  var tsDataMeasures = [trainDataMeasures, trainDataMeasures, trainDataMeasures, validationDataMeasures, testDataMeasures];
  
  // Start with the dimensions of highest weight
  /*var numW = weightVectors.length;
  var lastW = weightVectors[numW - 1].map(function (x) {
      return parseFloat(x);
    });
  var sortW = new Array();
  for (var i = 0; i < numDim; i++) {
    sortW.push({v:Math.abs(lastW[i + 1]), index:i});
  }
  
  function compareW(a, b) {
    if (a.v < b.v)
      return 1;
    if (a.v > b.v)
      return -1;
    return 0;
  }
  
  var sortW = sortW.sort(compareW);
  
  var currentXDim = sortW[0].index;
  var currentYDim = sortW[1].index;*/
  
  var currentFeatureDim = [0, 1, 2];
  var numPlots = 3;
  var xScaleArray = new Array(numPlots * numPlots);
  var yScaleArray = new Array(numPlots * numPlots);
  var correctPointRadius = 2;
  var mistakePointRadius = 4;
  
  // tooltip for point descriptions
  var tip = d3.tip()
              .attr("class", "d3-tip")
              .offset([-9, 0])
              .html(function (d) {
                var lines = new Array();
                lines.push("<b>Point:</b> (" + d.x + ", " + d.y + ")");
                lines.push("<b>Actual class:</b> " + d.dclass);
                lines.push("<b>Pred. class:</b> " + d.pclass);
                return lines.join("<br />");
              });
              
  // Add a color scale for the classes
  var colorScale = d3.scale.ordinal().domain(
      ["class-1-correct", "class-1-incorrect", "class-2-correct", "class-2-incorrect", "black"]
  );
  //colorScale.range(["#ff7f0e", "#998F3D", "#1f77b4", "#14B1CC", "#262626"])

  // reverse the color of correct and incorrect for each class
  colorScale.range(["#998F3D", "#ff7f0e", "#14B1CC", "#1f77b4", "#4D9E62"])
  
  var plotData = function(replot, dodelete, xi, yi, plotWidth, plotHeight) {
    var xdim = currentFeatureDim[xi];
    var ydim = currentFeatureDim[numPlots - yi - 1];
    var curPlotIndex = xi + yi * numPlots;  

    // Clear out anything plotted previously if we are fully replotting
    var plotWidthPadding = 20;
    var plotHeightPadding = 10;
    if (dodelete) {
      plotGroupParent.selectAll("g").remove();
    }
    
    if (replot) {
      plotGroup = plotGroupParent.append("g");
      plotGroup.attr("id", "plot" + curPlotIndex);
      var plotArea = plotGroup.append("rect")
             .attr("x", axesPadding + labelPadding + xi * plotWidth)
             .attr("y", yi * plotHeight)
             .attr("width", plotWidth - plotWidthPadding)
             .attr("height", plotHeight - plotHeightPadding)
             .attr("fill", "#eee")
             .attr("opacity", 0.5);
    } else {
      plotGroup = plotGroupParent.select("#plot" + curPlotIndex);
    }

    // Get all of the current variables
    var data = tsDatasets[currentTimeSeries];
    var dataMeasures = tsDataMeasures[currentTimeSeries];
    var w = weightVectors[currentIndex];
    
    // Setup the tooltip
    plotGroup.call(tip);
  
    // First we want to get the data for each dimension
    // Additionally we want to keep track of various measures for each axis
    var plotCorrectData = new Array();
    var plotMistakeData = new Array();
    var minX = dataMeasures.mins[xdim];
    var maxX = dataMeasures.maxs[xdim];
    var minY = dataMeasures.mins[ydim];
    var maxY = dataMeasures.maxs[ydim];
    var meanX = dataMeasures.means[xdim];
    var meanY = dataMeasures.means[ydim];
    var stdX = dataMeasures.stds[xdim];
    var stdY = dataMeasures.stds[ydim];
    var numDim = data[0].length - 1;
    
    // Convert the w vector into floats
    for (var i = 0; i < numDim + 1; i++) {
      w[i] = parseFloat(w[i]);
    }
    
    for (var i = 0; i < data.length; i++) {
      var x = data[i][xdim];
      var y = data[i][ydim];
      
      // Also keep track of each class we encounter. This will be the last token of each line
      var lineClass = data[i][numDim];
      
      // Calculate the predicted class given the w vector
      var predSum = w[0];
      for (var j = 0; j < numDim; j++) {
        var dataPoint = (data[i][j] - dataMeasures.means[j]) / dataMeasures.stds[j];
        predSum += w[j + 1] * dataPoint;
      }
      var predClass = predSum > 0 ? classes[0] : classes[1];
      
      if (lineClass == predClass) {
        plotCorrectData.push({"x":x, "y":y, "dclass":lineClass, "pclass":predClass});
      } else {
        plotMistakeData.push({"x":x, "y":y, "dclass":lineClass, "pclass":predClass});
      }
      
      if (classes.indexOf(lineClass) < 0) {
        classes.push(lineClass);
      }
    }
    
    if (replot) {
      // Add padding to each of min/max X and min/maxY
      var widthPadding = (maxX - minX) * dataPaddingPercentage;
      minX -= widthPadding;
      maxX += widthPadding;
      var heightPadding = (maxY - minY) * dataPaddingPercentage;
      minY -= heightPadding;
      maxY += heightPadding;
      
      // Set up the axes
      xScale = d3.scale.linear()
                     .domain([minX, maxX])
                     .nice()
                     .range([axesPadding + labelPadding + xi * plotWidth, axesPadding + labelPadding + (xi + 1) * plotWidth - plotWidthPadding]);
      xScaleArray[curPlotIndex] = xScale;
      var xAxis = d3.svg.axis()
                        .scale(xScale);
      var xTicks = xScale.ticks(10);
      yScale = d3.scale.linear()
                     .domain([minY, maxY])
                     .nice()
                     .range([(yi + 1) * plotHeight - plotHeightPadding, yi * plotHeight]);
      yScaleArray[curPlotIndex] = yScale;
      var yAxis = d3.svg.axis()
                        .scale(yScale)
                        .orient("left");
      var yTicks = yScale.ticks(10);
      
      // Readjust the min and max values based on the "nice" function
      minX = xScale.domain()[0];
      maxX = xScale.domain()[1];
      minY = yScale.domain()[0];
      maxY = yScale.domain()[1];
      
      // Plot the axes
      if (yi + 1 == numPlots) {
        plotGroup.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(0, " + (numPlots * plotHeight - plotHeightPadding) + ")")
            .call(xAxis);
      }
      if (xi == 0) {
        plotGroup.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(" + (axesPadding + labelPadding) + ", 0)")
            .call(yAxis);
      }
          
      // Plot the gridlines
      var xGridlines = plotGroup.selectAll("vline")
                                .data(xTicks)
                                .enter()
                                .append("line");
      xGridlines.attr("x1", function (d) { return xScale(d); })
                .attr("y1", yScale(minY))
                .attr("x2", function (d) { return xScale(d); })
                .attr("y2", yScale(maxY))
                .attr("class", "gridline");
      
      var yGridlines = plotGroup.selectAll("hline")
                                .data(yTicks)
                                .enter()
                                .append("line");
      yGridlines.attr("x1", xScale(minX))
                .attr("y1", function (d) { return yScale(d); })
                .attr("x2", xScale(maxX))
                .attr("y2", function (d) { return yScale(d); })
                .attr("class", "gridline");
      
      correctPointsGroup = plotGroup.append("g");
      correctPointsGroup.attr("id", "correctPoints");
      mistakePointsGroup = plotGroup.append("g");
      mistakePointsGroup.attr("id", "mistakePoints");
    } else {
      xScale = xScaleArray[curPlotIndex];
      yScale = yScaleArray[curPlotIndex];
      correctPointsGroup = plotGroup.select("#correctPoints");
      mistakePointsGroup = plotGroup.select("#mistakePoints");
    }
    
    // Plot all of the points             
    var correctPoints = correctPointsGroup.selectAll("circle")
                                          .data(plotCorrectData);
                                          
    correctPoints.enter()
                 .append("circle");
                     
    // Assign all of the point attributes
    correctPoints.attr("cx", function (d) { return xScale(d.x); })
                 .attr("cy", function (d) { return yScale(d.y); })
                 .attr("r", correctPointRadius)
                 .attr("fill-opacity", 0)
                 .attr("stroke", function (d) { 
                      if (d.dclass == classes[0])
                        return colorScale("class-1-correct");
                      else
                        return colorScale("class-2-correct");
                    });
    
    correctPoints.exit().remove();
                                          
    var mistakePaths = mistakePointsGroup.selectAll("path")
                                         .data(plotMistakeData);
                                         
    mistakePaths.enter()
                .append("path");
                     
    // Assign all of the point attributes
    mistakePaths.attr("d", function (d) {
                    var x = xScale(d.x);
                    var y = yScale(d.y);
                    return drawCross(x, y, mistakePointRadius);
                  })
                .attr("stroke-width", 2)
                .attr("stroke", function (d) { 
                    if (d.dclass == classes[0])
                      return colorScale("class-1-incorrect");
                    else
                      return colorScale("class-2-incorrect");
                  });
    
    mistakePaths.exit().remove();
    
    // Creates circles behind the paths for better tooltip response                                          
    var mistakePoints = mistakePointsGroup.selectAll("circle")
                                          .data(plotMistakeData);
                                          
    mistakePoints.enter()
                 .append("circle");
                     
    // Assign all of the point attributes
    mistakePoints.attr("cx", function (d) { return xScale(d.x); })
                 .attr("cy", function (d) { return yScale(d.y); })
                 .attr("r", mistakePointRadius)
                 .attr("fill-opacity", 0.0)
                 .on("mouseover", function(d) {
                      tip.show(d);
                    })
                 .on("mouseout", function() {
                      tip.hide();
                    });
    
    mistakePoints.exit().remove();
    
    if (replot) {
      // Add labels with rectangles to the axes
      if (yi + 1 == numPlots) {
        var xlabel = plotGroup.append("g");
        var xLabelRect = xlabel.append("rect");
        xlabel.append("text")
              .data([xi])
              .text(fitText(featureNames[xdim][0], plotWidth - plotWidthPadding))
              .attr("class", "label")
              .style("visibility", "hidden");
        var xLabelWidth = xlabel.select("text").node().getComputedTextLength();
        var xLabelX = labelPadding + axesPadding + (plotWidth - xLabelWidth - plotWidthPadding) / 2 + xi * plotWidth;
        var xLabelY = axesPadding + numPlots * plotHeight - plotHeightPadding - 4;
        xLabelRect.attr("x", xLabelX - 2 * rectLabelPadding)
                  .attr("y", xLabelY - textHeight)
                  .attr("width", xLabelWidth + 4 * rectLabelPadding)
                  .attr("height", textHeight + 2 * rectLabelPadding)
                  .attr("fill", "#eee")
                  .attr("fill-opacity", 0.5);
      
        xlabel.select("text")
              .attr("x", xLabelX)
              .attr("y", xLabelY)
              .style("cursor", "pointer")
              .style("visibility", "visible")
              .on("mouseover", function() {
                  // On mouse over we want to display a darker rectangle behind the label
                  xLabelRect.attr("fill", "#ddd");
                })
              .on("mouseout", function() {
                  xLabelRect.attr("fill", "#eee");
                })
              .on("click", function (d) {
                  if (selectedAxis != 0 || selectedFeatureIndex != d) {
                    var featureSelectorX = margin.left + labelPadding + axesPadding + xi * plotWidth + (plotWidth - (longestFeatureWidth + 10 * rectLabelPadding)) / 2;
                    var featureSelectorY = margin.top + labelPadding + fullPlotHeight - textHeight * maxFeaturesInList;
                    
                    if (featureSelectorX < margin.left + labelPadding + axesPadding) {
                      featureSelectorX = margin.left + labelPadding + axesPadding;
                    }
                    
                    if (featureSelectorX > margin.left + labelPadding + axesPadding + fullPlotWidth - longestFeatureWidth) {
                      featureSelectorX = margin.left + labelPadding + axesPadding + fullPlotWidth - longestFeatureWidth;
                    }
                    
                    featureSelectorGroup.style("left", featureSelectorX + "px")
                                        .style("top", featureSelectorY + "px")
                                        .style("visibility", "visible");
                    selectedAxis = 0;
                    selectedFeatureIndex = d;
                  } else {
                    featureSelectorGroup.style("visibility", "hidden");
                    selectedAxis = -1;
                    selectedFeatureIndex = -1;
                  }
                });
      }
      
      if (xi == 0) {
        var ylabel = plotGroup.append("g");
        var yLabelRect = ylabel.append("rect");
        ylabel.append("text")
              .data([numPlots - yi - 1])
              .text(fitText(featureNames[ydim][0], plotHeight - plotHeightPadding))
              .attr("class", "label")
              .style("visibility", "hidden");
        var yLabelWidth = ylabel.select("text").node().getComputedTextLength();
        var yLabelY = (plotHeight - plotHeightPadding + yLabelWidth) / 2 + yi * plotHeight;
        yLabelRect.attr("x", -5)
                  .attr("y", yLabelY - yLabelWidth - 2 * rectLabelPadding)
                  .attr("width", textHeight + 2 * rectLabelPadding)
                  .attr("height", yLabelWidth + 4 * rectLabelPadding)
                  .attr("fill", "#eee")
                  .attr("fill-opacity", 0.5);
        ylabel.select("text")
              .attr("transform", "translate(" + 5 + "," + yLabelY + ")rotate(-90)")
              .style("cursor", "pointer")
              .style("visibility", "visible")
              .on('mouseover', function() {
                  // On mouse over we want to display a darker rectangle behind the label
                  yLabelRect.attr("fill", "#ddd");
                })
              .on('mouseout', function() {
                  yLabelRect.attr("fill", "#eee");
                })
              .on("click", function (d) {
                  if (selectedAxis != 1 || selectedFeatureIndex != d) {
                    var featureSelectorX = labelPadding + axesPadding + margin.left;
                    var featureSelectorY = margin.top + yi * plotHeight + (plotHeight - textHeight * maxFeaturesInList) / 2;
                    
                    if (featureSelectorY < margin.top) {
                      featureSelectorY = margin.top;
                    }
                    
                    if (featureSelectorY > margin.top + fullPlotHeight - textHeight * maxFeaturesInList) {
                      featureSelectorY = margin.top + fullPlotHeight - textHeight * maxFeaturesInList;
                    }
                    
                    featureSelectorGroup.style("left", featureSelectorX + "px")
                                        .style("top", featureSelectorY + "px")
                                        .style("visibility", "visible");
                    selectedAxis = 1;
                    selectedFeatureIndex = d;
                  } else {
                    featureSelectorGroup.style("visibility", "hidden");
                    selectedAxis = -1;
                    selectedFeatureIndex = -1;
                  }
                });
      }
    }
  }
  
  function plotAllData(redraw) {  
    // Plot the weight vector
    for (var i = 0; i < numPlots; i++) {
      for (var j = 0; j < numPlots; j++) {
        plotData(redraw, (i == 0) && (j == 0) && redraw ? true : false, i, j, fullPlotWidth / numPlots, fullPlotHeight / numPlots);
      }
    }
  }
  
  plotAllData(true);
  
  // Add a legend to the bottom right
  var legendPadding = 12;
  var mistakePredLegend = plot.append("g");
  mistakePredLegend.append("text")
                   .text("Incorrect " + classes[0] + " Classification")
                   .attr("class", "label")
                   .style("visibility", "hidden");
           
  var mistakePredictionWidth = mistakePredLegend.select("text").node().getComputedTextLength();
  var curX = width - 8 - mistakePredictionWidth;
  
  mistakePredLegend.select("text")
                   .attr("x", curX)
                   .attr("y", fullPlotHeight + axesPadding - 8 + legendPadding)
                   .style("visibility", "visible");
  
  mistakePredLegend.append("text")
                   .text("Incorrect " + classes[1] + " Classification")
                   .attr("class", "label")
                   .attr("x", curX)
                   .attr("y", fullPlotHeight + axesPadding + 8 + legendPadding);
             
  curX = curX - 4 - mistakePointRadius;
  plot.append("path")               
           .attr("d", function () {
              return drawCross(curX, fullPlotHeight + axesPadding - 11 + legendPadding, mistakePointRadius);
            })
           .attr("stroke-width", 2)
           .attr("stroke", function () { 
                return colorScale("class-1-incorrect");
            });

  plot.append("path")               
           .attr("d", function () {
              return drawCross(curX, fullPlotHeight + axesPadding + 5 + legendPadding, mistakePointRadius);
            })
           .attr("stroke-width", 2)
           .attr("stroke", function () { 
                return colorScale("class-2-incorrect");
            });


  var correctPredLegend = plot.append("g");
  correctPredLegend.append("text")
                   .text("Correct " + classes[0] + " Classification")
                   .attr("class", "label")
                   .style("visibility", "hidden");
           
  var correctPredictionWidth = correctPredLegend.select("text").node().getComputedTextLength();
  curX = curX - correctPredictionWidth - 20 - mistakePointRadius;
  
  correctPredLegend.select("text")
                   .attr("x", curX)
                   .attr("y", fullPlotHeight + axesPadding - 8 + legendPadding)
                   .style("visibility", "visible");
                   
  correctPredLegend.append("text")
                   .text("Correct " + classes[1] + " Classification")
                   .attr("class", "label")
                   .attr("x", curX)
                   .attr("y", fullPlotHeight + axesPadding + 8 + legendPadding);
                   
  curX = curX - 4 - correctPointRadius;
  plot.append("circle")
           .attr("cx", curX)
           .attr("cy", fullPlotHeight + axesPadding - 11 + legendPadding)
           .attr("r", correctPointRadius)
           .attr("fill-opacity", 0)
           .attr("stroke", colorScale("class-1-correct"));
           
  plot.append("circle")
           .attr("cx", curX)
           .attr("cy", fullPlotHeight + axesPadding + 5 + legendPadding)
           .attr("r", correctPointRadius)
           .attr("fill-opacity", 0)
           .attr("stroke", colorScale("class-2-correct"));
  
  // Create a list of all the features to use for selecting the axes
  var maxFeaturesInList = 20;
  var featureSelectorGroup = d3.select("body").append("div")
                                              .style("left", "0px")
                                              .style("top", "0px")
                                              .style("width", (longestFeatureWidth + 10 * rectLabelPadding) + "px")
                                              .style("height", (textHeight * maxFeaturesInList) + "px")
                                              .style("position", "absolute")
                                              .style("visibility", "hidden")
                                              .style("overflow", "auto");
  
  // Use a table to keep track of the features
  var featureSelectorTable = featureSelectorGroup.append("table")
                                                 .attr("bgcolor", "#eee")
                                                 .style("opacity", 0.9);
  var featureTableRows = featureSelectorTable.selectAll("tr")
                                             .data(featureNames)
                                             .enter()
                                             .append("tr");

  featureTableRows.text(function (d) { return d[0]; })
                  .style("cursor", "pointer")
                  .attr("class", "label")
                  .on("mouseover", function() {
                      d3.select(this).attr("bgcolor", "#ddd");
                    })
                  .on("mouseout", function() {
                      d3.select(this).attr("bgcolor", "#eee");
                    })
                  .on("click", function(d, i) {
                      featureSelectorGroup.style("visibility", "hidden");
                      // Redraw with the given feature
                      currentFeatureDim[selectedFeatureIndex] = i;
                      selectedAxis = -1;
                      selectedFeatureIndex = -1;
                      plotAllData(true);
                    });

  /** Slider bar and distribution chart **/
  // plot the distribution
  var bottomPlotHeight = botHeight - axesPadding - labelPadding;
  var leftChartEdge = margin.left;
  var bottomChart = bottom.append("g")
    .attr("transform", "translate(" + axesPadding + ",0)");

  var dist = bottomChart.append("path");
  var distHeight = bottomPlotHeight;//botHeight * (3.0/3);
  var x = d3.scale.linear()
    //.domain([0, data.length])
    .range([1, fullPlotWidth])
    .clamp(true);
  var y = d3.scale.linear()
    //.domain([0, d3.max(data)])
    .range([bottomPlotHeight, 0]);

  //var xAxis = d3.svg.axis()
    //.scale(x);
  //var yAxis = d3.svg.axis()
    //.scale(y)
    //.orient("left");
  var distXAxis = bottomChart.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + bottomPlotHeight + ")");
    //.call(xAxis.orient("bottom"));
  var distYAxis = bottomChart.append("g")
    .attr("class", "y axis")
    .attr("transform", "translate(" + x(0) + ",0)");
    //.call(yAxis);

  var area = d3.svg.area()
    .x(function (d, i) { return x(i); })
    .y0(distHeight)
    .y1(function (d, i) { return y(d); });
  var curve = d3.svg.line()
    .interpolate("linear")
    .x(function (d, i) { return x(i); })
    .y(function (d, i) { return y(d); });
  //dist.datum(data)
    //.attr("fill", colorScale("incorrect"))
    //.attr("d", area);

  // draw the slider and indicator line
  var line = bottomChart.append("line")
    .attr("class", "sliderLine")
    //.attr("x1", 0 + x(0))
    .attr("y1", 0)
    //.attr("x2", 0 + x(0))
    .attr("y2", bottomPlotHeight);
  var brush = d3.svg.brush()
      //.x(x)
      .extent([0, 0]);
      //.on("brush", brushed);
  var slider = bottomChart.append("g")
    .attr("class", "slider");
    //.call(brush);

  slider.selectAll(".extent,.resize")
    .remove();

  var handle = slider.append("circle")
      .attr("class", "handle")
      //.attr("transform", "translate(" + x(0) + "," + bottomPlotHeight + ")")
      .attr("r", 9);

  function drawDist(data) {
    var minValue = d3.min(data);
    var maxValue = d3.max(data);
    var xAxisYValue = bottomPlotHeight;
    var yAxisMinValue = 0;
    var yAxisMaxValue = maxValue;
    var useArea = true;
    var colorType = "incorrect";

    x.domain([0, data.length]);
    y.domain([yAxisMinValue, yAxisMaxValue]);

    if (minValue < 0) {
      yAxisMinValue = Math.min(minValue, -maxValue);
      yAxisMaxValue = Math.max(-minValue, maxValue);
      y.domain([yAxisMinValue, yAxisMaxValue]);
      xAxisYValue = y(0);
      useArea = false;
    } else if (minValue >= 0 && maxValue <= 1) {
      yAxisMaxValue = 1;
      y.domain([yAxisMinValue, yAxisMaxValue]);
      xAxisYValue = y(0);
      useArea = false;
      colorType = "correct";
    }
    colorType = "black";

    var xAxis = d3.svg.axis()
      .scale(x);
    var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left");
    distXAxis
      .attr("transform", "translate(0," + (xAxisYValue) + ")")
      .call(xAxis.orient("bottom"));
    distYAxis
      .attr("transform", "translate(" + x(0) + ",0)")
      .call(yAxis);

    if (useArea) {
      area
        .x(function (d, i) { return x(i); })
        .y1(function (d, i) { return y(d); });
      dist.datum(data)
        .attr("fill", colorScale(colorType))
        .attr("stroke-width", 1)
        .attr("stroke", colorScale(colorType))
        .attr("d", area);
    } else {
      curve
        .x(function (d, i) { return x(i); })
        .y(function (d, i) { return y(d); });
      dist.datum(data)
        .attr("fill", "none")
        .attr("stroke-width", 1)
        .attr("stroke", colorScale(colorType))
        .attr("d", curve);
    }

    // draw the slider and indicator line
    line
      .attr("x1", 0 + x(currentIndex))
      //.attr("y1", y(data[0]))
      .attr("x2", 0 + x(currentIndex));
      //.attr("y2", bottomPlotHeight/2);
    brush.x(x)
        //.extent([0, 0])
        .on("brush", brushed);
    slider.call(brush);

    slider.selectAll(".extent,.resize")
      .remove();

    handle.attr("transform", "translate(" + x(0) + "," + (xAxisYValue) + ")");
    handle.attr("cx", x(currentIndex));

    function brushed() {
      var value = brush.extent()[0];

      if (d3.event.sourceEvent) { // not a programmatic event
        value = x.invert(d3.mouse(this)[0]);
        brush.extent([value-1, value-1]);
      }

      handle.attr("cx", x(value));
      var index = Math.min(data.length - 1, Math.max(0, value));
      //var lineHeight = y(0.5 * (data[Math.floor(index)] + data[Math.ceil(index)]));
      var lineHeight = y(data[Math.round(index)]);
      line.attr("x1", x(index))
        .attr("x2", x(index))
        //.attr("y1", lineHeight);
      
      // Replot the data
      currentIndex = Math.floor(index);
      plotAllData(false);
    }
  }

  timeSeriesTypes = [errors, errorDeltas, trainAccuracies,
      validationAccuracies, testAccuracies];
  currentTimeSeries = 0;
  drawDist(timeSeriesTypes[0]);
  //drawDist(timeSeriesTypes[1]);

  var timeSeriesNames = ["Number of errors", "Change in errors",
      "Training set accuracy", "Validation set accuracy", "Test set accuracy"];
  var longestNameWidth = 0;
  for (var i = 0; i < timeSeriesNames.length; i++) {
    hiddenText.text(timeSeriesNames[i])
              .attr("class", "label");
    var nameWidth = hiddenText.node().getComputedTextLength();

    if (nameWidth > longestNameWidth) {
      longestNameWidth = nameWidth;
    }
  }
  var maxTypesInList = timeSeriesNames.length;
  var timeSeriesSelectorGroup = d3.select("body").append("div")
    .style("left", "0px")
    .style("top", "0px")
    .style("width", (longestNameWidth + 10 * rectLabelPadding) + "px")
    .style("height", (textHeight * maxTypesInList) + "px")
    .style("position", "absolute")
    .style("visibility", "hidden");

  // Use a table to keep track of the features
  var timeSeriesSelectorTable = timeSeriesSelectorGroup.append("table")
    .attr("bgcolor", "#eee")
    .style("opacity", 0.9);
  var timeSeriesTableRows = timeSeriesSelectorTable.selectAll("tr")
    .data(timeSeriesNames)
    .enter()
    .append("tr");

  var yAxisSelected = false;
  timeSeriesTableRows.text(function (d) { return d; })
                  .style("cursor", "pointer")
                  .attr("class", "label")
                  .on("mouseover", function() {
                      d3.select(this).attr("bgcolor", "#ddd");
                    })
                  .on("mouseout", function() {
                      d3.select(this).attr("bgcolor", "#eee");
                    })
                  .on("click", function(d, i) {
                      timeSeriesSelectorGroup.style("visibility", "hidden");
                      // Redraw with the given type
                      currentTimeSeries = i;
                      yAxisSelected = false;
                      label = yLabel.select("text");
                      label.text(timeSeriesNames[currentTimeSeries]);
                      var newYLabelWidth = yLabel.select("text").node().getComputedTextLength();
                      var newYLabelY = (bottomPlotHeight + newYLabelWidth) / 2;
                      label.attr("transform", "translate(" + 5 + "," + newYLabelY + ")rotate(-90)")
                      yLabelRect
                        .attr("y", newYLabelY - newYLabelWidth - 2 * rectLabelPadding)
                        .attr("height", newYLabelWidth + 4 * rectLabelPadding);
                      plotAllData(true);
                      drawDist(timeSeriesTypes[i]);
                    });

  var yLabel = bottom.append("g");
  var yLabelRect = yLabel.append("rect");
  yLabel.append("text")
        .text(timeSeriesNames[0])
        .attr("class", "label")
        .style("visibility", "hidden");
  var yLabelWidth = yLabel.select("text").node().getComputedTextLength();
  var yLabelY = (bottomPlotHeight + yLabelWidth) / 2;
  yLabelRect.attr("x", -5)
            .attr("y", yLabelY - yLabelWidth - 2 * rectLabelPadding)
            .attr("width", textHeight + 2 * rectLabelPadding)
            .attr("height", yLabelWidth + 4 * rectLabelPadding)
            .attr("fill", "#eee")
            .attr("fill-opacity", 0.5);
  yLabel.select("text")
        .attr("transform", "translate(" + 5 + "," + yLabelY + ")rotate(-90)")
        .style("cursor", "pointer")
        .style("visibility", "visible")
        .on('mouseover', function() {
            // On mouse over we want to display a darker rectangle behind the label
            yLabelRect.attr("fill", "#ddd");
          })
        .on('mouseout', function() {
            yLabelRect.attr("fill", "#eee");
          })
        .on("click", function () {
            if (!yAxisSelected) {
              var timeSeriesSelectorX = labelPadding + axesPadding + margin.left;
              var timeSeriesSelectorY = margin.top + topHeight + (bottomPlotHeight - textHeight * maxTypesInList) / 2;
              timeSeriesSelectorGroup.style("left", timeSeriesSelectorX + "px")
                                  .style("top", timeSeriesSelectorY + "px")
                                  .style("visibility", "visible");
              yAxisSelected = true;
            } else {
              timeSeriesSelectorGroup.style("visibility", "hidden");
              yAxisSelected = false;
            }
          });

    var xLabel = bottom.append("g");
    xLabel.append("text")
          .text("Iterations")
          .attr("class", "label")
          .style("visibility", "hidden");
    var xLabelWidth = xLabel.select("text").node().getComputedTextLength();
    var xLabelX = labelPadding + axesPadding + (fullPlotWidth - xLabelWidth) / 2;
    var xLabelY = bottomPlotHeight + axesPadding;
    xLabel.select("text")
          .attr("x", xLabelX)
          .attr("y", xLabelY)
          .style("visibility", "visible");
}
var webSocket = new WebSocket("ws://localhost:9999");
webSocket.onmessage = function (event) {
  //console.log(JSON.parse(event.data));
  updateVisualization(JSON.parse(event.data));
}
webSocket.onopen = function () {
  console.log("opened");
  webSocket.send("test");
}
