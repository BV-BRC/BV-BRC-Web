class QueryResult {
    constructor(items,meta={}){
        this.items=items
        this.start=meta.start||0
        this.total_items = meta.total_items || this.length
    }
}

module.exports = QueryResult