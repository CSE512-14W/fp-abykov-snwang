Interactive Visualizations for Supervised Learning
===============
Alexandre Bykov, Stanley Wang {abykov,snwang}@uw.edu

Our visualization consists of three main parts, which we split up between the two of us. 

The first part (top) is a scatterplot matrix that shows the entire dataset projected into multiple dimension pairs. This part was developed by Alex. The first step was simply figuring out how to project the data into two dimensions chosen by the user. This also included creating an interface to let the user select which features to use from an arbitrarily long list. The next step was to create tooltips for interaction with all of the mis-classified points. The final part was creating a matrix of scatterplots with configurable rows and columns. Since the visualization is meant to be used while the algorithm is running, a key issue was making sure that the classifier could be changed and the matrix would be updated in an effecient manner.

The second part (bottom) is a plot of multiple summary statistics over algorithm iteration. This part was developed by Stanley. As with the scatterplot matrix, a similar issue was providing an interface for the user to select which summary statistic was plotted. The second key part was to actually plot each statistic over time and allow the user to scroll through the individual iterations. The plots were made to be extandable since the number of iterations keeps increasing as the algorithm runs. As the user selects each iteration, the scatterplot matrix updates with the newest classifier and the classifications are redrawn.

The third part was the backend communication between the python SVM implementation and our D3 visualization. This part was developed by Stanley. This involved setting up all of the parameters and data inputs for the SVM algorithm in python and then communicating per-iteration results to the D3 visualization. As the results came in, the visualizaiton calls appropriate functions to update the scatterplot matrix and summary statistics plots with data from the new iterations.

Overall we felt that the development process went very smoothly. Given the distinct split between the two parts of the visualization, we found it very easy to work on each part separately. The two parts did need to be merged in the end but this merging was relatively easy given our modular design. We also made sure to make all of our code data independent, which made it very easy to try new datasets. The biggest obstacle we had was related to plotting the decision boundaries. At first we thought that we could simply project the linear hyperplane into two dimensions but then we realized that this would not actually give us a sensible decision boundary. We therefore had to resort to simply labeling each point whether it was correctly classified or not.
