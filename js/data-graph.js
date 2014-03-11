// Partition the visualization space.
var margin = {top: 40, right: 30, bottom: 20, left: 30, between:20},
    width = 1280 - margin.left - margin.right,
    height = 800 - margin.top - margin.bottom,
    topHeight = Math.round(height * 0.7),
    botHeight = height - topHeight;

var fullChart = d3.select("body")
                  .append("svg")
                  .attr("width", width + margin.left + margin.right)
                  .attr("height", height + margin.top + margin.bottom);

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
  
function drawElements(err, unparsedTrainData, unparsedValidationData, 
    unparsedTestData, unparsedFeatureNames, unparsedWeightVectors, 
    unparsedErrors, unparsedTrainAccuracies, unparsedValidationAccuracies, 
    unparsedTestAccuracies, unparsedClassNames) {
    
  var parsedTrainData = d3.csv.parseRows(unparsedTrainData);
  var parsedValidationData = d3.csv.parseRows(unparsedValidationData);
  var parsedTestData = d3.csv.parseRows(unparsedTestData);
  
  var featureNames = d3.csv.parseRows(unparsedFeatureNames);
  var errors = d3.csv.parseRows(unparsedErrors).map(function (x) {
    return Math.round(parseFloat(x[0]));
  });
  var trainAccuracies = d3.csv.parseRows(unparsedTrainAccuracies).map(function (x) {
    return parseFloat(x[0]);
  });
  var validationAccuracies = d3.csv.parseRows(unparsedValidationAccuracies).map(function (x) {
    return parseFloat(x[0]);
  });
  var testAccuracies = d3.csv.parseRows(unparsedTestAccuracies).map(function (x) {
    return parseFloat(x[0]);
  });
  var weightVectors = d3.csv.parseRows(unparsedWeightVectors);
  var classes = d3.csv.parseRows(unparsedClassNames);

  var errorDeltas = new Array(errors.length);
  errorDeltas[0] = 0;
  for (var i = 1; i < errors.length; i++) {
    errorDeltas[i] = errors[i] - errors[i-1];
  }
  
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
  var plotWidth = width - axesPadding - labelPadding;
  var plotHeight = topHeight - axesPadding - labelPadding;
  var plotArea = plot.append("rect")
                     .attr("x", axesPadding + labelPadding)
                     .attr("width", plotWidth)
                     .attr("height", plotHeight)
                     .attr("fill", "#eee")
                     .attr("opacity", 0.5);
  
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
  var currentXDim = 0;
  var currentYDim = 1;
  var currentIndex = 0;
  var currentTimeSeries = 0;
  var tsDatasets = [parsedTrainData, parsedTrainData, parsedTrainData, parsedValidationData, parsedTestData];
  var tsDataMeasures = [trainDataMeasures, trainDataMeasures, trainDataMeasures, validationDataMeasures, testDataMeasures];
  
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
  var colorScale = d3.scale.category10().domain(["correct", "incorrect"]);
  
  var plotData = function(replot) {
    // Clear out anything plotted previously if we are fully replotting
    if (replot) {
      plotGroupParent.selectAll("g").remove();
      plotGroup = plotGroupParent.append("g");
    }

    // Get all of the current variables
    var data = tsDatasets[currentTimeSeries];
    var dataMeasures = tsDataMeasures[currentTimeSeries];
    var xdim = currentXDim;
    var ydim = currentYDim;
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
                     .range([axesPadding + labelPadding, width]);
      var xAxis = d3.svg.axis()
                        .scale(xScale);
      var xTicks = xScale.ticks(10);
      yScale = d3.scale.linear()
                     .domain([minY, maxY])
                     .nice()
                     .range([plotHeight, 0]);
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
      plotGroup.append("g")
          .attr("class", "axis")
          .attr("transform", "translate(0, " + plotHeight + ")")
          .call(xAxis);
      plotGroup.append("g")
          .attr("class", "axis")
          .attr("transform", "translate(" + (axesPadding + labelPadding) + ", 0)")
          .call(yAxis);
          
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
      mistakePointsGroup = plotGroup.append("g");
    }
    
    // Plot all of the points
    correctPointsGroup.selectAll("circle")
                      //.data(plotCorrectData)
                      //.exit()
                      .remove();
                                          
    var correctPoints = correctPointsGroup.selectAll("circle")
                                          .data(plotCorrectData)
                                          .enter()
                                          .append("circle");
                     
    // Assign all of the point attributes
    var correctPointRadius = 1;
    var mistakePointRadius = 3;
    
    correctPoints.attr("cx", function (d) { return xScale(d.x); })
                 .attr("cy", function (d) { return yScale(d.y); })
                 .attr("r", correctPointRadius)
                 .attr("fill", colorScale("correct"));
    
    mistakePointsGroup.selectAll("circle")
                      //.data(plotMistakeData)
                      //.exit()
                      .remove();
                                          
    var mistakePoints = mistakePointsGroup.selectAll("circle")
                                          .data(plotMistakeData)
                                          .enter()
                                          .append("circle");
                     
    // Assign all of the point attributes
    mistakePoints.attr("cx", function (d) { return xScale(d.x); })
                 .attr("cy", function (d) { return yScale(d.y); })
                 .attr("r", mistakePointRadius)
                 .attr("fill", colorScale("incorrect"))
                 .on("mouseover", function(d) {
                      tip.show(d);
                    })
                 .on("mouseout", function() {
                      tip.hide();
                    });
    
    if (replot) {
      // Add labels with rectangles to the axes    
      var xlabel = plotGroup.append("g");
      var xLabelRect = xlabel.append("rect");
      xlabel.append("text")
            .text(featureNames[xdim][0])
            .attr("class", "label")
            .style("visibility", "hidden");
      var xLabelWidth = xlabel.select("text").node().getComputedTextLength();
      var xLabelX = labelPadding + axesPadding + (plotWidth - xLabelWidth) / 2;
      var xLabelY = plotHeight + axesPadding;
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
            .on("click", function () {
                if (selectedAxis != 0) {
                  var featureSelectorX = margin.left + labelPadding + axesPadding + (plotWidth - (longestFeatureWidth + 10 * rectLabelPadding)) / 2;
                  var featureSelectorY = margin.top + labelPadding + plotHeight - textHeight * maxFeaturesInList;
                  featureSelectorGroup.style("left", featureSelectorX + "px")
                                      .style("top", featureSelectorY + "px")
                                      .style("visibility", "visible");
                  selectedAxis = 0;
                } else {
                  featureSelectorGroup.style("visibility", "hidden");
                  selectedAxis = -1;
                }
              });
              
      var ylabel = plotGroup.append("g");
      var yLabelRect = ylabel.append("rect");
      ylabel.append("text")
            .text(featureNames[ydim][0])
            .attr("class", "label")
            .style("visibility", "hidden");
      var yLabelWidth = ylabel.select("text").node().getComputedTextLength();
      var yLabelY = (plotHeight + yLabelWidth) / 2;
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
            .on("click", function () {
                if (selectedAxis != 1) {
                  var featureSelectorX = labelPadding + axesPadding + margin.left;
                  var featureSelectorY = margin.top + (plotHeight - textHeight * maxFeaturesInList) / 2;
                  featureSelectorGroup.style("left", featureSelectorX + "px")
                                      .style("top", featureSelectorY + "px")
                                      .style("visibility", "visible");
                  selectedAxis = 1;
                } else {
                  featureSelectorGroup.style("visibility", "hidden");
                  selectedAxis = -1;
                }
              });
              
      // Add a legend to the bottom right
      var mistakePredLegend = plotGroup.append("g");
      mistakePredLegend.append("text")
                       .text("Incorrect Classification")
                       .attr("class", "label")
                       .style("visibility", "hidden");
               
      var mistakePredictionWidth = mistakePredLegend.select("text").node().getComputedTextLength();
      var curX = width - 4 - mistakePredictionWidth;
      
      mistakePredLegend.select("text")
                       .attr("x", curX)
                       .attr("y", plotHeight + axesPadding)
                       .style("visibility", "visible");
                       
      curX = curX - 4 - mistakePointRadius;
      plotGroup.append("circle")
               .attr("cx", curX)
               .attr("cy", plotHeight + axesPadding - 3)
               .attr("r", mistakePointRadius)
               .attr("fill", colorScale("incorrect"));
               
      var correctPredLegend = plotGroup.append("g");
      correctPredLegend.append("text")
                       .text("Correct Classification")
                       .attr("class", "label")
                       .style("visibility", "hidden");
               
      var correctPredictionWidth = correctPredLegend.select("text").node().getComputedTextLength();
      curX = curX - correctPredictionWidth - 20 - mistakePointRadius;
      
      correctPredLegend.select("text")
                       .attr("x", curX)
                       .attr("y", plotHeight + axesPadding)
                       .style("visibility", "visible");
                       
      curX = curX - 4 - correctPointRadius;
      plotGroup.append("circle")
               .attr("cx", curX)
               .attr("cy", plotHeight + axesPadding - 3)
               .attr("r", correctPointRadius)
               .attr("fill", colorScale("correct"));
    }
  }
  
  // Plot the weight vector
  plotData(true);
  
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
                      if (selectedAxis == 0) {
                        currentXDim = i;
                      } else {
                        currentYDim = i;
                      }
                      selectedAxis = -1;
                      plotData(true);
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
    .range([1, plotWidth])
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
      .attr("x1", 0 + x(0))
      //.attr("y1", y(data[0]))
      .attr("x2", 0 + x(0));
      //.attr("y2", bottomPlotHeight/2);
    brush.x(x)
        //.extent([0, 0])
        .on("brush", brushed);
    slider.call(brush);

    slider.selectAll(".extent,.resize")
      .remove();

    handle.attr("transform", "translate(" + x(0) + "," + (xAxisYValue) + ")");

    function brushed() {
      var value = brush.extent()[0];

      if (d3.event.sourceEvent) { // not a programmatic event
        value = x.invert(d3.mouse(this)[0]);
        brush.extent([value, value]);
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
      plotData(false);
    }
  }

  var timeSeriesTypes = [errors, errorDeltas, trainAccuracies,
      validationAccuracies, testAccuracies];
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
                      plotData(true);
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
}
