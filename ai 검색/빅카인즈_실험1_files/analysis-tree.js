var outerCircleRadiuses = [];
var AnalysisTree = function (mapId) {
    this.mapId = mapId;
    this.minWaight = 3;
}

AnalysisTree.prototype.setOriginNetworkData = function(nodes, links) {
    var self = this;

    self.nodes = nodes;
    self.links = links;

    self.treeData = _.find(self.nodes, function(node) { return node.id === "ROOT"; });
    self.treeData.name = self.treeData.label_ne || self.treeData.title || "";
    self.treeData.size = 5;
    self.treeData.children = [
        {
            id: "news",
            name: "News",
            size: 3,
            type: "NewsLabel",
            children: []
        }, {
            id: "person",
            name: "인물",
            size: 3,
            type: "PersonLabel",
            children: []
        }, {
            id: "location",
            name: "장소",
            size: 3,
            type: "LocationLabel",
            children: []
        }, {
            id: "orgnization",
            name: "기관",
            size: 3,
            type: "OrgLabel",
            children: []
        }, {
            id: "keyword",
            name: "키워드",
            size: 3,
            type: "KeywordLabel",
            children: []
        }
    ];

    _.forEach(self.nodes, function(node) {
        if (node.id !== "ROOT") {
            node.name = node.label_ne || node.title || "";
            node.size = Math.log10(node.weight);
            node.type = node.category.toLowerCase();

            var categoryGroup = _.find(self.treeData.children, function(c) {
                return c.id === node.type;
            });

            categoryGroup.children.push(node);
        }
    });

    self.renderDatamap();
}

AnalysisTree.prototype.renderDatamap = function() {
    var svg = d3.select(this.mapId);
    var width = $("#tree-container").width(),
        height = width;

    $(this.mapId).height(height + 200);

    svg.select("g").remove();
    var g = svg.append("g").attr("transform", "translate(" + (width / 2) + "," + ((height / 2) + 100) + ")");

    var radius = Math.min(width, height) / 2;
    var tree = d3.tree().size([2 * Math.PI, radius])
        .separation(function(a, b) {
            return (a.parent == b.parent ? 1 : 2) / a.depth;
        });

    var nodes = d3.hierarchy(this.treeData, function(d) {
        return d.children;
    });

    var root = tree(nodes);
    // root.children.forEach(this.collapseLevel);

    for (var l of root.links()) {
        AnalysisTree.directLine(l, 0);
    }

    for(var r of outerCircleRadiuses) {
        if (r) {
            g.append("circle")
                .attr("r", r)
                .attr("class", "outer-line");
        }
    }

    var link = g.selectAll(".link")
        .data(root.links())
        .enter().append("path")
        .attr("class", function(d) {
            return "link " + d.target.data.relation_type;
        })
        .attr("d", AnalysisTree.directLine);

    var node = g.selectAll(".node")
        .data(root.descendants())
        .enter().append("g")
        .attr("class", function(d) { return "node" + (d.children ? " node--internal" : " node--leaf"); })
        .attr("transform", function(d) { return "translate(" + AnalysisTree.radialPoint(d.x, d.y) + ")"; });

    node.append("circle")
        .attr("class", function(d) {
            return "node " + d.data.type;
        })
        .attr("r", function(d) {
            return 4 * d.data.size;
        }).on("mouseover", function() {

    });

    node.append("circle")
        .attr("class", function(d) {
            return "inner " + d.data.type;
        })
        .attr("r", function(d) {
            return 4 * d.data.size - 4;
        });

    node.append("text")
        .attr("dy", "0.31em")
        .attr("x", function(d) {
            // return d.x < Math.PI === !d.children ? 6 : 6;
            return 5 * d.data.size;
        })
        .attr("text-anchor", function(d) {
            // return d.x < Math.PI === !d.children ? "start" : "start";
            return "start";
        })
        .attr("transform", function(d) {
            return "rotate(320)";
        })
        .text(function(d) {
            return d.data.name;
        });

}

AnalysisTree.radialPoint = function(x, y) {
    return [(y = +y) * Math.cos(x -= Math.PI / 2), y * Math.sin(x)];
}

AnalysisTree.directLine = function(d, i) {
    var sourceP = AnalysisTree.radialPoint(d.source.x, d.source.y);
    var targetP = AnalysisTree.radialPoint(d.target.x, d.target.y);

    if (outerCircleRadiuses[d.target.depth] == null) {
        outerCircleRadiuses[d.target.depth] = Math.sqrt(targetP[0] * targetP[0] + targetP[1] * targetP[1]);
    }

    return "M" + sourceP[0] + "," + sourceP[1]
        +"L" + targetP[0] + "," + targetP[1];
}
