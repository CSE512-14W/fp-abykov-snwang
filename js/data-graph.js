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
   
  // Plot the weight vector
  plotData(0, 1, weightVectors[14409]);
   
  function plotData(xdim, ydim, w) {
    // Plot the rectangle behind the actual plot
    var plotWidth = width - axesPadding - labelPadding;
    var plotHeight = topHeight - axesPadding - labelPadding;
    var plotArea = plot.append("rect")
                       .attr("x", axesPadding + labelPadding)
                       .attr("width", plotWidth)
                       .attr("height", plotHeight)
                       .attr("fill", "#eee")
                       .attr("opacity", 0.5);
  
    // First we want to get the data for each dimension
    // Additionally we want to keep track of various measures for each axis
    var plotData = new Array();
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
      
      plotData.push({"x":x, "y":y, "dclass":lineClass, "pclass":predClass});
      
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
    plot.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0, " + plotHeight + ")")
        .call(xAxis);
    plot.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(" + (axesPadding + labelPadding) + ", 0)")
        .call(yAxis);
        
    // Plot the gridlines
    var xGridlines = plot.selectAll("vline")
                         .data(xTicks)
                         .enter()
                         .append("line");
    xGridlines.attr("x1", function (d) { return xScale(d); })
              .attr("y1", yScale(minY))
              .attr("x2", function (d) { return xScale(d); })
              .attr("y2", yScale(maxY))
              .attr("class", "gridline");
    
    var yGridlines = plot.selectAll("hline")
                         .data(yTicks)
                         .enter()
                         .append("line");
    yGridlines.attr("x1", xScale(minX))
              .attr("y1", function (d) { return yScale(d); })
              .attr("x2", xScale(maxX))
              .attr("y2", function (d) { return yScale(d); })
              .attr("class", "gridline");
    
    // Add labels to the axes
    var xlabel = plot.append("g");
    xlabel.append("text")
          .text(featureNames[xdim][0])
          .attr("class", "label")
          .style("visibility", "hidden");
    var xLabelWidth = xlabel.select("text").node().getComputedTextLength();
    xlabel.select("text")
          .attr("x", labelPadding + axesPadding + (plotWidth - xLabelWidth) / 2)
          .attr("y", plotHeight + axesPadding)
          .style("visibility", "visible");
          
    var ylabel = plot.append("g");
    ylabel.append("text")
          .text(featureNames[ydim][0])
          .attr("class", "label")
          .style("visibility", "hidden");
    var yLabelWidth = ylabel.select("text").node().getComputedTextLength();
    ylabel.select("text")
          .attr("transform", "translate(" + 0 + "," + ((plotHeight + yLabelWidth) / 2) + ")rotate(-90)")
          .style("visibility", "visible");
    
    // Add a color scale for the classes
    var colorScale = d3.scale.category10();
        
    // Plot all of the points
    var points = plot.selectAll("circle")
                     .data(plotData)
                     .enter()
                     .append("circle");
                     
    // Assign all of the point attributes
    points.attr("cx", function (d) { return xScale(d.x); })
          .attr("cy", function (d) { return yScale(d.y); })
          .attr("r", 2)
          .attr("fill", function (d) { return colorScale(classes.indexOf(d.dclass)); });
          
    // Plot the decision boundary (just linear for now)
    var numPointsInLine = 1000;
    var pointDelta = (maxX - minX) / numPointsInLine;
    var decisionBoundaryData = new Array();
    var w0 = w[0];
    var w1 = w[xdim + 1];
    var w2 = w[ydim + 1];
    for (var x = minX; x <= maxX; x += pointDelta) {
    
      var y = -(w0 + w1 * (x - meanX) / stdX) * stdY / w2 + meanY;
      
      if (y >= minY && y <= maxY) {
        decisionBoundaryData.push({"dx":x, "dy":y});
      }
    }
    
    var decisionBoundary = plot.append("g")
                               .selectAll("circle")
                               .data(decisionBoundaryData)
                               .enter()
                               .append("circle");
                     
    decisionBoundary.attr("cx", function (d) { return xScale(d.dx); })
                    .attr("cy", function (d) { return yScale(d.dy); })
                    .attr("r", 1)
                    .attr("fill", "black");
  }
}