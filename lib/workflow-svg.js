var WorkflowSVG = (function () {
    const PADDING = 50;
    const MARGIN = 50;
    var _json = { entities:[]};
    var _draw;
    var _selectedPoints = [];
    var _lines = [];
    var _documentLoaded = false;
    var _callbacks = {};

    function initalize(id, width, height){
        SVG.on(document, 'DOMContentLoaded', function() {
            _draw = SVG().addTo(id).size(width, height);
            _draw.entities = [];
            _draw.lines = _draw.group();
        });
    }       
    
    function _createEntity(_draw, entity) {
        var group = _draw.group().attr({id: entity.id});
        _draw.entities.push(group);

        //assginment and default values for entities
        entity.backgroundcolor = entity.backgroundcolor ? entity.backgroundcolor : '#f06';
        entity.color = entity.color ? entity.color : '#ffffff';
        entity.radius = entity.radius ? entity.radius : 0;

        group.dragPoints = [];

        //the real entity
        group.entity = group.rect(entity.width, entity.height)
            .move(entity.x, entity.y)
            .attr({ fill: entity.backgroundcolor })
            .radius(entity.radius);

        group.entity.displaytype = entity.displaytype;

        if(entity.displaytype==='or'){
            group.entity.transform({'rotate': 45, origin: 'center center'});
        }

        if(entity.class){
            group.entity.attr("class", entity.class);
        }
  
        group.text(entity.text)
            .cx(entity.x+(entity.width/2))
            .cy(entity.y+(entity.height/2))
            .attr({ fill: entity.color})
            .font({
                family: 'Helvetica'
            });

        group.arrows = group.group();

        var hoverArea = group.rect(entity.width+MARGIN, entity.height+MARGIN)
                            .move(entity.x-(MARGIN/2),entity.y-(MARGIN/2))
                            .attr({ opacity: '0', fill:'#FFBF00'});

        if(entity.displaytype==='or'){
            hoverArea.transform({'rotate': 45});
        }
        
        group.dragGroup = group.group(); 

        //dragabble area
        var draggableElement = group.rect(entity.width-PADDING, entity.height-PADDING)
            .move(entity.x+(PADDING/2),entity.y+(PADDING/2))
            .attr({ opacity: '0' });

        if(!_json.configuration.readonly){
            draggableElement.draggable()
            .on('dragmove.namespace', (e) => {
                e.preventDefault();
                var box = e.detail.box;

                // needed because svg.draggable.js seems to have a problem with transformed group
                if(group.entity.displaytype==='or'){
                    group.entity.transform({rotate: 0});
                }
                
                group.move(box.x-(PADDING), box.y-(PADDING)); 
                // group.cx(box.cx);
                // group.cy(box.cy); 
    
                //to update json
                entity.x =  box.x-(PADDING);
                entity.y =  box.y-(PADDING); 
                
                // needed because svg.draggable.js seems to have a problem with transformed group
                if(group.entity.displaytype==='or'){
                    group.entity.transform({rotate: 45});
                }

                _renderPolylines(_draw, _lines);
            })
            .attr({'cursor': 'grab'})
            .on('dragend', (e) => {
                _call('entity:moved',  _getIdFromEntity(e));
            })
            .on('click', (e) => {
                _call('entity:clicked', _getIdFromEntity(e));
            });

             // if hovering - show drag points
            hoverArea.on('mouseover', function(evt){
                _renderPoint(_draw, group, 'top');
                _renderPoint(_draw, group, 'right');
                _renderPoint(_draw, group, 'bottom');
                _renderPoint(_draw, group, 'left');
                evt.stopPropagation();
            });

             // if hovering outside - remove drag points (except the one selected)
            _draw.on('mouseover', function(){
                group.dragPoints.forEach(d => {
                        if(!_selectedPoints.includes(d)){
                            d.remove();
                        }
                });
            });
        }

    }

    function _renderPoint(_draw, group, id){
        var x = _calculateX(group.entity, id);
        var y = _calculateY(group.entity, id);
        group.dragPoints.push(group.dragGroup.circle(10, 10)
                .attr({ fill:'white', stroke:'#d4d4d4', id: id})
                .move(x-5, y-5)
                .on('mouseover', function(evt){
                    // make point bigger
                    this.transform({scale: 2});
                    evt.stopPropagation();
                })
                .on('click', function(){
                    if(!_selectedPoints.includes(this)){
                        _selectedPoints.push(this);
                        if(_selectedPoints.length == 2){
                            var newLine = {
                                id: 'line-'+_lines.length,
                                from: {
                                    element: _selectedPoints[0].parent().parent().attr('id'),
                                    point: _selectedPoints[0].attr('id'),
                                },
                                to: {
                                    element: _selectedPoints[1].parent().parent().attr('id'),
                                    point: _selectedPoints[1].attr('id')
                                }
                            };
                            _lines.push(newLine);
                            _json.lines.push(_copy(newLine));
                            _renderPolylines(_draw, _lines);
                            _selectedPoints = [];
                            _call('line:added', newLine);
                        } 
                    }else{
                        _selectedPoints = [];
                    }
                })
                .on('mouseout', function(evt){
                    if(!_selectedPoints.includes(this)){
                        this.transform({scale: 1});
                    }
                
                    evt.stopPropagation();
                })
            );
    }

    function _renderPolylines(_draw, _lines){
        _lines.forEach(line => _renderOnePolyline(_draw, line));
    }

    function _renderOnePolyline(_draw, line){
        var polyline = '';
        var line_color = _json.configuration.line_color;
        var from = _draw.findOne('#'+line.from.element);
        var to = _draw.findOne('#'+line.to.element);
        var pointsInBetween = _calculatePointsInBetween(line, from, to);

        //start point
        polyline += _calculateX(from.entity, line.from.point) +','+_calculateY(from.entity, line.from.point)+' ';
        
        // points between them
        pointsInBetween.forEach(p => polyline += p.x +','+ p.y +' ');

        //end point - we have to cut a little bit because of the arrow
        if(line.to.point === "top"){
            polyline += _calculateX(to.entity, line.to.point) +','+(_calculateY(to.entity, line.to.point)-5)+' ';
        } else if(line.to.point === "right") {
            polyline += (_calculateX(to.entity, line.to.point)+5) +','+_calculateY(to.entity, line.to.point)+' ';
        } else if(line.to.point === "bottom"){
            polyline += _calculateX(to.entity, line.to.point) +','+(_calculateY(to.entity, line.to.point)+5)+' ';
        } else{
            polyline += (_calculateX(to.entity, line.to.point)-5) +','+_calculateY(to.entity, line.to.point)+' ';
        }

        if(!line.polyline){
            line.polyline = _draw.lines.polyline(polyline)
                .fill('none')
                .stroke({ color: line_color, width: 4, linecap: 'round', linejoin: 'round' })
                .on('click', (e) => {
                    _call('line:clicked', e.target.id);
                })
                .attr('id', line.id);
; 
        }else{
            line.polyline.plot(polyline);
        }

        _renderArrow(line, to, line_color);

    }

    function _renderArrow(line, to, line_color){
        if(!line.to.arrow){
            if(_json.configuration.arrow_type==='default'){
                var arrow = _calculateX(to.entity, line.to.point) +','+_calculateY(to.entity, line.to.point) + ' ';
                if(line.to.point === 'top'){
                    arrow += (_calculateX(to.entity, line.to.point)+7) +','+(_calculateY(to.entity, line.to.point)-14) + ' ';
                    arrow += (_calculateX(to.entity, line.to.point)-7) +','+(_calculateY(to.entity, line.to.point)-14) + ' ';
                } else if(line.to.point === 'right'){
                    arrow += (_calculateX(to.entity, line.to.point)+14) +','+(_calculateY(to.entity, line.to.point)-7) + ' ';
                    arrow += (_calculateX(to.entity, line.to.point)+14) +','+(_calculateY(to.entity, line.to.point)+7) + ' ';
                } else if(line.to.point === 'bottom'){
                    arrow += (_calculateX(to.entity, line.to.point)+7) +','+(_calculateY(to.entity, line.to.point)+14) + ' ';
                    arrow += (_calculateX(to.entity, line.to.point)-7) +','+(_calculateY(to.entity, line.to.point)+14) + ' ';
                } else {
                    arrow += (_calculateX(to.entity, line.to.point)-14) +','+(_calculateY(to.entity, line.to.point)-7) + ' ';
                    arrow += (_calculateX(to.entity, line.to.point)-14) +','+(_calculateY(to.entity, line.to.point)+7) + ' ';
                }
                line.to.arrow = to.arrows.polygon(arrow).fill(line_color).stroke({ width: 1 });
            }
        }
    }

    function _calculatePointsInBetween(line, from, to){
        var pointsInBetween = [];

        var y1 = _calculateY(from.entity, line.from.point);
        var y2 = _calculateY(to.entity, line.to.point);
        var x1 = _calculateX(from.entity, line.from.point);
        var x2 = _calculateX(to.entity, line.to.point);

        var p1 = _translatePositionToNumber(line.from.point);
        var p2 = _translatePositionToNumber(line.to.point);
        var code = p1-p2; 

        // same position
        if(code === 0) {
            if(line.from.point === 'top'){
                if( y1 <= y2) {
                    pointsInBetween.push({x: x1, y:y1-20});
                    pointsInBetween.push({x: x2, y:y1-20});
                } else {
                    pointsInBetween.push({x: x1, y:y2-20});
                    pointsInBetween.push({x: x2, y:y2-20});
                }
            } else if(line.from.point === 'bottom'){
                if( y1 <= y2) {
                    pointsInBetween.push({x: x1, y:y2+20});
                    pointsInBetween.push({x: x2, y:y2+20});
                } else {
                    pointsInBetween.push({x: x1, y:y1+20});
                    pointsInBetween.push({x: x2, y:y1+20});
                }
            } else if(line.from.point === 'left') {
                if( x1 <= x2) {
                    pointsInBetween.push({x: x1-20, y:y1});
                    pointsInBetween.push({x: x1-20, y:y2});
                } else {
                    pointsInBetween.push({x: x2-20, y:y1});
                    pointsInBetween.push({x: x2-20, y:y2});
                }
            } else{
                if( x1 <= x2) {
                    pointsInBetween.push({x: x2+20, y:y1});
                    pointsInBetween.push({x: x2+20, y:y2});
                } else {
                    pointsInBetween.push({x: x1+20, y:y1});
                    pointsInBetween.push({x: x1+20, y:y2});
                }
            }
        }

        // on the opposite site
        if(code === 2 || code === -2){
            if(line.from.point === 'left' || line.from.point === 'right'){
                 if(y1 !== y2){
                        pointsInBetween.push({x: x1+((x2-x1)/2), y: y1});
                        pointsInBetween.push({x: x1+((x2-x1)/2), y: y2});  
                }
            } else{ // top or bottom
                if(x1 !== x2){
                        pointsInBetween.push({x: x1, y: y2+((y1-y2)/2)});
                        pointsInBetween.push({x: x2, y: y2+((y1-y2)/2)});
                }
            }
        }

        // corner cases
        if(code === 1 || code === -1 || code === 3 || code === -3){
            if(line.from.point === 'top' ){
                if(y1 <= y2){
                    pointsInBetween.push({x: x1, y:y1-20});
    
                    if(line.to.point === 'left'){
                        pointsInBetween.push({x: x2-20,  y:y1-20});
                        pointsInBetween.push({x: x2-20,  y:y2});
                    } else{
                        pointsInBetween.push({x: x2+20,  y:y1-20});
                        pointsInBetween.push({x: x2+20,  y:y2});
                    }
    
                } else {
                    pointsInBetween.push({x: x1, y:y2});
                }
            }

            if(line.from.point === 'bottom'){
                if(y1 >= y2){
                    pointsInBetween.push({x: x1, y:y1+20});
                    if(line.to.point === 'left'){
                        pointsInBetween.push({x: x2-20,  y:y1+20});
                        pointsInBetween.push({x: x2-20,  y:y2});
                    }else{
                        pointsInBetween.push({x: x2+20,  y:y1+20});
                        pointsInBetween.push({x: x2+20,  y:y2});
                    }
                    
                } else {
                    pointsInBetween.push({x: x1, y:y2});
                }
            }

            if(line.from.point === 'left'){
                if(y1 > y2){
                    if(line.to.point === 'top'){
                        pointsInBetween.push({x: x1-20,  y:y1});
                        pointsInBetween.push({x: x1-20,  y:y2-20});
                        pointsInBetween.push({x: x2, y:y2-20});
                    }else{
                        pointsInBetween.push({x: x2, y:y1});
                    }
                    
                } else {
                    if(line.to.point === 'top'){
                        pointsInBetween.push({x: x2, y:y1});
                    } else{
                        pointsInBetween.push({x: x1-20,  y:y1});
                        pointsInBetween.push({x: x1-20,  y:y2+20});
                        pointsInBetween.push({x: x2, y:y2+20});
                    }
                }
            }

            if(line.from.point === 'right'){
                if(y1 > y2){
                    if(line.to.point === 'top'){
                        pointsInBetween.push({x: x1+20,  y:y1});
                        pointsInBetween.push({x: x1+20,  y:y2-20});
                        pointsInBetween.push({x: x2, y:y2-20});
                    }else{
                        pointsInBetween.push({x: x2, y:y1});
                    }
                    
                } else {
                    if(line.to.point === 'top'){
                        pointsInBetween.push({x: x2, y:y1});
                    } else{
                        pointsInBetween.push({x: x1+20,  y:y1});
                        pointsInBetween.push({x: x1+20,  y:y2+20});
                        pointsInBetween.push({x: x2, y:y2+20});
                    }
                }
            }
        }

        return pointsInBetween;
    }

    function _translatePositionToNumber(position){
        switch(position){
            case 'top': return 0;
            case 'right': return 1;
            case 'bottom': return 2;
            default: return 3;
        }
    }

    function _calculateX(entity, position){
        var width = (entity.displaytype==='or') ? _pythagorean(entity.attr('width'), entity.attr('height')) : entity.attr('width');

        switch(position){
            case 'right':
                return entity.cx()+(width/2);
            case 'top':
            case 'bottom':
                return  entity.cx();
            default:
                return entity.cx()-(width/2);
        }
    }

    function _calculateY(entity, position){
        var height = (entity.displaytype==='or') ? _pythagorean(entity.attr('width'), entity.attr('height')) : entity.attr('height');

        switch(position){
            case 'right':
                return entity.cy();
            case 'top':
                return entity.cy()-(height/2);
            case 'bottom':
                return entity.cy()+(height/2);
            default:
                return entity.cy();
        }       
    }

    function _pythagorean(a, b){
        return Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
    }

    function _copy(obj){
        return JSON.parse(JSON.stringify(obj));
    }

    function _update(){
        _draw.entities.forEach(entity => entity.remove());
        _draw.entities = [];

        _lines.forEach(arrow => arrow.remove());
        _lines = [];

        _selectedPoints = [];

        if(!_json.configuration){
            _json.configuration = {};
        }

        //default value for config
        _json.configuration.readonly = _json.configuration.readonly ? _json.configuration.readonly  : false; 
        _json.configuration.line_color = _json.configuration.line_color ? _json.configuration.line_color : '#000000';
        _json.configuration.arrow_type = _json.configuration.arrow_type ? _json.configuration.arrow_type : 'default';

        _json.entities.map(entity => {
            entity.displaytype = entity.displaytype ? entity.displaytype: 'entity';

            if(entity.displaytype==='or'){
                entity.width = 60;
                entity.height = 60;
                entity.text = 'X';
            }
        })
        _json.entities.forEach(entity => _createEntity(_draw, entity));

        _lines = _copy(_json.lines);

        _renderPolylines(_draw, _lines);

    }

    function _call(eventname, obj){
        if(_callbacks[eventname] !== null && _callbacks[eventname] !== undefined){
            _callbacks[eventname].forEach(callback => callback(obj));
        }
    }

    function _getIdFromEntity(e){
        var id = '';
        if(e && e.target && e.target.parentElement){
            id = e.target.parentElement.id;
        }
        return id;
    }
    
    function update(json){
        _json = _copy(json);
        if(!_documentLoaded){
            SVG.on(document, 'DOMContentLoaded', function() {
                _update();
                _documentLoaded = true;
            });
        }else{
            _update();
        }
    }

    function register(eventname, callback){
        if(_callbacks[eventname] === null || _callbacks[eventname] === undefined){
            _callbacks[eventname] = [];
        }

        _callbacks[eventname].push(callback);
    }

    function get(){
        return _json;
    }

    return {
        initalize: initalize,
        update: update,
        register: register,
        get: get
    }
});
