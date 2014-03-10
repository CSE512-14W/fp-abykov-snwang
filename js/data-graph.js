// Partition the visualization space.
var margin = {top: 40, right: 30, bottom: 20, left: 30},
    width = 1280 - margin.left - margin.right,
    height = 800 - margin.top - margin.bottom,
    topHeight = Math.round(height * 0.7),
    botHeight = height - botHeight;

var fullChart = d3.select("body")
                  .append("svg")
                  .attr("width", width + margin.left + margin.right)
                  .attr("height", height + margin.top + margin.bottom);

var plot = fullChart.append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
                    
// The padding for the axes
var axesPadding = 40;

// The padding for the axes labels
var labelPadding = 0;

// The padding between data points and axes
var dataPaddingPercentage = 0.02;
                    
// Load in all of the data
queue()
  .defer(d3.text, "data/biodeg.csv")
  .defer(d3.text, "data/biodeg-features.txt")
  .defer(d3.text, "data/biodeg-w.csv")
  .defer(d3.text, "data/biodeg-classes.txt")
  .await(drawElements);
  
function drawElements(err, unparsedData, unparsedFeatureNames, unparsedWeightVectors, unparsedClassNames) {
  var parsedData = d3.csv.parseRows(unparsedData);
  var featureNames = d3.csv.parseRows(unparsedFeatureNames);
  var weightVectors = d3.csv.parseRows(unparsedWeightVectors);
  var classes = d3.csv.parseRows(unparsedClassNames);
   
  // To make life easier for us later we can compute the min, max, mean and std of each dimension here
  var numDim = parsedData[0].length - 1;
  var featureMins = new Array(numDim);
  var featureMaxs = new Array(numDim);
  var featureMeans = new Array(numDim);
  var featureStds = new Array(numDim);
   
  // Initialize everything
  for (var i = 0; i < numDim; i++) {
    featureMins[i] = parsedData[0][i];
    featureMaxs[i] = parsedData[0][i];
    featureMeans[i] = 0;
    featureStds[i] = 0;
  }
   
  for (var i = 0; i < parsedData.length; i++) {
    for (var j = 0; j < numDim; j++) {
      var val = parseFloat(parsedData[i][j]);
      parsedData[i][j] = val;
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
    featureMeans[i] /= parsedData.length;
  }
  
  // We need one more pass through the data to calculate the std
  for (var i = 0; i < parsedData.length; i++) {
    for (var j = 0; j < numDim; j++) {
      var diff = parsedData[i][j] - featureMeans[j];
      featureStds[j] += diff * diff;
    }
  }
  
  for (var i = 0; i < numDim; i++) {
    featureStds[i] /= (parsedData.length - 1);
    featureStds[i] = Math.sqrt(featureStds[i]);
  }
  
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
  
  // Constants necessary for the axes labels
  var textHeight = 12;
  var rectLabelPadding = 2;
  var selectedAxis = -1;
  var currentXDim = 0;
  var currentYDim = 1;
  
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
  
  var plotData = function(xdim, ydim, w) {
    // Clear out anything plotted previously
    plotGroupParent.selectAll("g").remove();
    var plotGroup = plotGroupParent.append("g");
    
    // Setup the tooltip
    plotGroup.call(tip);
  
    // First we want to get the data for each dimension
    // Additionally we want to keep track of various measures for each axis
    var plotCorrectData = new Array();
    var plotMistakeData = new Array();
    var minX = featureMins[xdim];
    var maxX = featureMaxs[xdim];
    var minY = featureMins[ydim];
    var maxY = featureMaxs[ydim];
    var meanX = featureMeans[xdim];
    var meanY = featureMeans[ydim];
    var stdX = featureStds[xdim];
    var stdY = featureStds[ydim];
    var numDim = parsedData[0].length - 1;
    
    // Convert the w vector into floats
    for (var i = 0; i < numDim + 1; i++) {
      w[i] = parseFloat(w[i]);
    }
    
    for (var i = 0; i < parsedData.length; i++) {
      var x = parsedData[i][xdim];
      var y = parsedData[i][ydim];
      
      // Also keep track of each class we encounter. This will be the last token of each line
      var lineClass = parsedData[i][numDim];
      
      // Calculate the predicted class given the w vector
      var predSum = w[0];
      for (var j = 0; j < numDim; j++) {
        var dataPoint = (parsedData[i][j] - featureMeans[j]) / featureStds[j];
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
    
    // Add padding to each of min/max X and min/maxY
    var widthPadding = (maxX - minX) * dataPaddingPercentage;
    minX -= widthPadding;
    maxX += widthPadding;
    var heightPadding = (maxY - minY) * dataPaddingPercentage;
    minY -= heightPadding;
    maxY += heightPadding;
    
    // Set up the axes
    var xScale = d3.scale.linear()
                   .domain([minX, maxX])
                   .nice()
                   .range([axesPadding + labelPadding, width]);
    var xAxis = d3.svg.axis()
                      .scale(xScale);
    var xTicks = xScale.ticks(10);
    var yScale = d3.scale.linear()
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
    
    // Add a color scale for the classes
    var colorScale = d3.scale.category10();
        
    // Plot all of the points
    var correctPoints = plotGroup.append("g")
                                 .selectAll("circle")
                                 .data(plotCorrectData)
                                 .enter()
                                 .append("circle");
                     
    // Assign all of the point attributes
    correctPoints.attr("cx", function (d) { return xScale(d.x); })
                 .attr("cy", function (d) { return yScale(d.y); })
                 .attr("r", 1)
                 .attr("fill", colorScale(0));
    
    var mistakePoints = plotGroup.append("g")
                                 .selectAll("circle")
                                 .data(plotMistakeData)
                                 .enter()
                                 .append("circle");
                     
    // Assign all of the point attributes
    mistakePoints.attr("cx", function (d) { return xScale(d.x); })
                 .attr("cy", function (d) { return yScale(d.y); })
                 .attr("r", 4)
                 .attr("fill", colorScale(1))
                 .on("mouseover", function(d) {
                      tip.show(d);
                    })
                 .on("mouseout", function() {
                      tip.hide();
                    });
    
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
                var featureSelectorX = labelPadding + axesPadding + (plotWidth - longestFeatureWidth) / 2;
                featureSelectors.attr("x", featureSelectorX);
                featureSelectorText.attr("x", featureSelectorX + 2 * rectLabelPadding);
                featureSelectorGroup.style("visibility", "visible");
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
                var featureSelectorX = labelPadding + axesPadding;
                featureSelectors.attr("x", featureSelectorX);
                featureSelectorText.attr("x", featureSelectorX + 2 * rectLabelPadding);
                featureSelectorGroup.style("visibility", "visible");
                selectedAxis = 1;
              } else {
                featureSelectorGroup.style("visibility", "hidden");
                selectedAxis = -1;
              }
            });
  }
  
  // Plot the weight vector
  plotData(currentXDim, currentYDim, weightVectors[10000]);
  
  // Create a list of all the features to use for selecting the axes  
  var featureSelectorGroup = plot.append("g")
                                 .style("visibility", "hidden");
  featureSelectors = featureSelectorGroup.selectAll("rect")
                                             .data(featureNames)
                                             .enter()
                                             .append("rect");
                                             
  featureSelectors.attr("y", function (d, i) { return i * textHeight; })
                  .attr("width", (longestFeatureWidth + 4 * rectLabelPadding))
                  .attr("height", textHeight)
                  .style("cursor", "pointer")
                  .attr("fill", "#eee")
                  //.attr("stroke", "#ddd")
                  .attr("fill-opacity", 0.9)
                  .on("mouseover", function() {
                      d3.select(this).attr("fill", "#ddd");
                    })
                  .on("mouseout", function() {
                      d3.select(this).attr("fill", "#eee");
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
                      plotData(currentXDim, currentYDim, weightVectors[10000]);
                    });
                    
  featureSelectorText = featureSelectorGroup.selectAll("text")
                                                .data(featureNames)
                                                .enter()
                                                .append("text");
  
  featureSelectorText.attr("y", function (d, i) { return (i + 1) * textHeight - rectLabelPadding; })
                     .attr("class", "label")
                     .text(function(d) { return d[0]; })  
                     .style("pointer-events", "none");
}