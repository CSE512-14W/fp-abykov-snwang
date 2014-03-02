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
var plotPadding = 30;

// The padding between data points and axes
var dataPaddingPercentage = 0.02;
                    
// Load in all of the data
queue()
  .defer(d3.text, "data/biodeg.csv")
  .await(drawElements);
  
function drawElements(err, unparsedData) {
  var parsedData = d3.csv.parseRows(unparsedData);
   
  plotData(16, 17);
   
  function plotData(xdim, ydim) {
    var plotArea = plot.append("rect")
                       .attr("x", plotPadding)
                       .attr("width", width - plotPadding)
                       .attr("height", topHeight - plotPadding)
                       .attr("fill", "#eee")
                       .attr("opacity", 0.5);
  
    // First we want to get the data for each dimension
    // Additionally we want to keep track of the minX, maxX, minY and maxY values for the axes
    var plotData = new Array();
    var minX = parsedData[0][xdim];
    var maxX = parsedData[0][xdim];
    var minY = parsedData[0][ydim];
    var maxY = parsedData[0][ydim];
    
    // Also keep track of each class we encounter. This will be the last token of each line
    var classes = new Array();
    var numDim = parsedData[0].length - 1;
    
    for (var i = 0; i < parsedData.length; i++) {
      var x = parseFloat(parsedData[i][xdim]);
      var y = parseFloat(parsedData[i][ydim]);
      if (x < minX) {
        minX = x;
      }
      if (x > maxX) {
        maxX = x;
      }
      if (y < minY) {
        minY = y;
      }
      if (y > maxY) {
        maxY = y;
      }
      var lineClass = parsedData[i][numDim];
      
      plotData.push({"x":x, "y":y, "class":lineClass});
      
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
                   .range([plotPadding, width]);
    var xAxis = d3.svg.axis()
                      .scale(xScale)
                      .ticks(10);
    var yScale = d3.scale.linear()
                   .domain([minY, maxY])
                   .range([topHeight - plotPadding, 0]);
    var yAxis = d3.svg.axis()
                      .scale(yScale)
                      .orient("left")
                      .ticks(10);
    
    // Plot the axes
    plot.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0, " + (topHeight - plotPadding) + ")")
        .call(xAxis);
    plot.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(" + plotPadding + ", 0)")
        .call(yAxis);
        
    // Plot all of the points
    var points = plot.selectAll("circle")
                     .data(plotData)
                     .enter()
                     .append("circle");
                     
    // Assign all of the point attributes
    points.attr("cx", function (d) { return xScale(d.x); })
          .attr("cy", function (d) { return yScale(d.y); })
          .attr("r", 2);
  }
}