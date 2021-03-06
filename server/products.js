var db = require('./pghelper');

function escape(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function findAll(req, res, next) {

    var pageSize = 30,
        page = req.query.page ? parseInt(req.query.page) : 1,
        search = req.query.search,
        min = req.query.min,
        max = req.query.max,
        whereParts = [],
        values = [];

    console.log(page);
    // step 1 of 4 to add attributes FJP - extend fields
    if (search) {
        values.push(escape(search));
        whereParts.push("beer.name || beer.video || beer.tags || brewery.name ~* $" + values.length);
    }
    if (min) {
        values.push(parseFloat(min));
        whereParts.push("beer.alcohol >= $" + values.length);
    }
    if (max) {
        values.push(parseFloat(max));
        whereParts.push("beer.alcohol <= $" + values.length);
    }

    var where = whereParts.length > 0 ? ("WHERE " + whereParts.join(" AND ")) : "";

    var countSql = "SELECT COUNT(*) from beer INNER JOIN brewery on beer.brewery_id = brewery.id " + where;
    // step 2 of 4 to add attributes FJP - extend fields
    var sql = "SELECT beer.id, beer.name, alcohol, tags, image, video, brewery.name as brewery " +
                "FROM beer INNER JOIN brewery on beer.brewery_id = brewery.id " + where +
                " ORDER BY beer.alcohol LIMIT $" + (values.length + 1) + " OFFSET $" +  + (values.length + 2);

    // TODO: Use q to run the two queries in parallel
    db.query(countSql, values)
        .then(function (result) {
            var total = parseInt(result[0].count);
            db.query(sql, values.concat([pageSize, ((page - 1) * pageSize)]))
                .then(function(products) {
                    return res.json({"pageSize": pageSize, "page": page, "total": total, "products": products});
                })
                .catch(next);
        })
        .catch(next);
};

function findById(req, res, next) {
    var id = req.params.id;
    // step 3 of 4 to add attributes FJP - extend fields
    var sql = "SELECT beer.id, beer.name, alcohol, tags, video, brewery.name as brewery FROM beer " +
                "INNER JOIN brewery on beer.brewery_id = brewery.id " +
                "WHERE beer.id = $1";

    db.query(sql, [id])
        .then(function (product) {
            return res.send(JSON.stringify(product));
        })
        .catch(next);
};

exports.findAll = findAll;
exports.findById = findById;