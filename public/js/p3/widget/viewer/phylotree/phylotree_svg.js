(function(root, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['./phylotree_base'], function(base) {
			return factory(root, base);
		});
	} else {
		factory(root, root);
	}
})(typeof window !== 'undefined' ? window : globalThis, function(global, base) {
const ns = "http://www.w3.org/2000/svg"; // store namespace
const PhyloTreeBase = (base && base.PhyloTreeBase) || global.PhyloTreeBase;
const PhyloNodeBase = (base && base.PhyloNodeBase) || global.PhyloNodeBase;

// An interactive SVG phylogenetic tree: a newick tree drawn with labelled tips, which a page can paint states,
// quantities and marks onto, and which reports what the reader does with it.
//
//     const tree = new PhyloTreeSvg(container, {newick, tip_metadata});
//     tree.on('node-click', ({node_id}) => tree.highlight_branch(node_id));
//     tree.set_node_states({A: 1, B: 2, C: 'unknown'}, {title: 'my character'});
//
// Needs phylotree_base.js loaded first, and the tree rules of phylotree.css.
class PhyloTreeSvg extends PhyloTreeBase {
	createNode(node_params) {
		return new PhyloNodeSvg(node_params);
	}

	constructor(container, newick_or_options = {}, maybe_options = {}) {
		const options = (typeof newick_or_options === 'string')
			? Object.assign({}, maybe_options, { newick: newick_or_options })
			: (newick_or_options || {});
		super(options.newick || '');
		this.container = undefined;
		this.svg = undefined;
		this.infoPanel = undefined;
		this.height = undefined;
		this.width = 800;
		this.delta_y = 14.0;
		this.x_scale = 1400;
		this.tree_width_prop = 0.45;
		this.quantity_display = false;
		this.tip_labels = {};
		this.x_shift_val = 20;
		this.pan_zoom = false;
		this.node_highlight_mode = 7;
		this.debug = 0;
		if (options.pan_zoom !== false)
			this.pan_zoom = true;
		this.listeners = {};
		this.announce_selection = !!options.announce_selection;
		this.id_label = options.id_label || 'ID';
		this.search_fields = options.search_fields || null;
		this.tip_labels = PhyloTreeSvg.metadata_by_field(options.tip_metadata);
		this.container = container;
		this.container.innerHTML = "";
		this.container.style.overflow = 'hidden';
		this.container.style.position = 'relative'; // anchor point for the absolutely-positioned glyph tooltip

		this.owns_header = !options.header;
		this.infoPanel = options.header || document.createElement('div');
		this.infoPanel.className = 'panel_header';
		if (this.owns_header)
			this.infoPanel.classList.add('phylotree_header');

		this.hide_default_title = (options.title === false);
		this.infoPanel_row1 = document.createElement('div');
		this.infoPanel_row1.className = 'panel_row';
		this.infoPanel_row1.style.alignItems = 'center';
		if (this.hide_default_title)
			this.infoPanel_row1.style.display = 'none';
		this.infoPanel.appendChild(this.infoPanel_row1);
		if (this.owns_header && options.title !== false) {
			const panel_name = document.createElement('span');
			panel_name.className = 'panel_title';
			panel_name.textContent = options.title || 'Tree';
			this.infoPanel_row1.appendChild(panel_name);
		}
		this.infoPanel_row2 = document.createElement('div');
		this.infoPanel_row2.className = 'panel_row';
		this.infoPanel_row2.style.alignItems = 'center';
		this.infoPanel_row2.style.justifyContent = 'space-between';
		this.infoPanel.appendChild(this.infoPanel_row2);

		this.glyph_key = document.createElement('div');
		this.glyph_key.style.cssText = 'flex: 1 1 auto; min-width: 0; align-self: stretch; overflow: hidden; box-sizing: border-box; ' +
			'padding: 1px 4px; background-color: white; border: 1px solid #cbd5e1; border-radius: 3px;';
		this.infoPanel_row1.appendChild(this.glyph_key);

		const key_row_style = 'font-size: 11px; line-height: 14px; min-height: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
		this.discrete_info_row = document.createElement('div');
		this.discrete_info_row.style.cssText = key_row_style;
		this.glyph_key.appendChild(this.discrete_info_row);
		this.quantity_info_row = document.createElement('div');
		this.quantity_info_row.style.cssText = key_row_style + ' color: #b5651d; display: none;';
		this.glyph_key.appendChild(this.quantity_info_row);
		this.infoText = this.discrete_info_row;
		this.glyph_tooltip_div = this.create_glyph_tooltip();

		if (this.owns_header)
			this.container.appendChild(this.infoPanel);
		this.treePanel = document.createElement('div');
		this.container.appendChild(this.treePanel);
		this.treePanel.style.clear = 'left';
		this.treePanel.style.height = this.body_height() + 'px';
		this.svg = document.createElementNS(ns, "svg");
		this.svg.classList.add('phylotree');
		this.treePanel.appendChild(this.svg);
		this.mouseDownStatus = false;

		this.svg.addEventListener('mousedown', e => {
			if (!this.pan_zoom)
				return;
			this.mousedown(true, e.x, e.y);
			e.preventDefault();
		});
		this.svg.addEventListener('mouseleave', e => this.mousedown(false, e.x, e.y));
		this.svg.addEventListener('mouseup', e => this.mousedown(false, e.x, e.y));
		this.svg.addEventListener('mousemove', e => this.mousemove(e.x, e.y));
		this.svg.addEventListener('wheel', e => {
			if (!this.pan_zoom)
				return;
			this.zoomAtPoint(e.clientX, e.clientY, e.deltaY);
			e.stopPropagation();
			e.preventDefault();
		}, { passive: false });

		this.svg.addEventListener('mousedown', e => {
			this.background_click_x = e.clientX;
			this.background_click_y = e.clientY;
			this.background_click_target = e.target;
		});
		this.svg.addEventListener('mouseup', e => {
			const dx = e.clientX - this.background_click_x;
			const dy = e.clientY - this.background_click_y;
			const moved = Math.sqrt(dx*dx + dy*dy);
			if (moved < 4 && this.background_click_target === this.svg && e.target === this.svg)
				this.emit('background-click', {});
		});

		this.parse_newick();
		if (this.root && this.root.group) {
			this.svg.appendChild(this.root.group);
		}

		// Label selector in row 2 (left side) and live tip search box in row 2 (right side)
		const label_wrap = document.createElement('span');
		label_wrap.style.cssText = 'display: inline-flex; align-items: center; gap: 3px; flex: 0 0 auto;';
		const label_text = document.createElement('span');
		label_text.textContent = 'Label:';
		label_text.style.cssText = 'font-size: 11px; color: #475569; font-weight: 600;';
		label_wrap.appendChild(label_text);
		const tiplabel_select = document.createElement("select");
		tiplabel_select.style.cssText = 'font-size: 11px; padding: 1px 3px; border: 1px solid #cbd5e1; border-radius: 3px; background: #fff; max-width: 115px;';
		label_wrap.appendChild(tiplabel_select);
		this.infoPanel_row2.appendChild(label_wrap);
		this.tiplabel_select = tiplabel_select;
		tiplabel_select.addEventListener("change", () => this.set_tiplabel(tiplabel_select.value));

		const search_box = document.createElement('span');
		search_box.style.cssText = 'flex: 1 1 auto; display: flex; align-items: center; justify-content: flex-end; gap: 4px; min-width: 0;';
		const search_input = document.createElement('input');
		search_input.type = 'search';
		search_input.placeholder = options.search_placeholder || 'Find genome...';
		search_input.title = 'Matching tip labels turn red; press Enter to step through matches';
		search_input.style.cssText = 'width: 100%; max-width: 130px; min-width: 65px; font-size: 11px; padding: 1px 5px; border: 1px solid #cbd5e1; border-radius: 3px;';
		search_input.addEventListener('input', () => this.search_tips(search_input.value));
		search_input.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.show_next_search_hit(); });
		this.search_count = document.createElement('span');
		this.search_count.style.cssText = 'font-size: 10px; color: #dc2626; font-weight: 600; white-space: nowrap;';
		search_box.appendChild(search_input);
		search_box.appendChild(this.search_count);
		this.infoPanel_row2.appendChild(search_box);

		if (options.node_labeled_tree)
			this.transfer_internal_node_ids(options.node_labeled_tree);

		this.width = this.container.clientWidth || 260;
		const height_needed = (this.delta_y) * (this.tips.length + 3);
		this.height = height_needed;

		this.treePanel.style.width = '100%';
		this.treePanel.style.height = this.body_height() + 'px';
		this.viewport_height = this.treePanel.clientHeight || 400;
		this.svg.setAttribute('style', `background-color: white; font-size: 12px; display: block; width: 100%; height: ${this.viewport_height}px`);

		for (const node of this.tips) {
			node.set_label(node.id);
		}
		this.update_tip_metadata(options.tip_metadata, options.label_field || options.default_label);

		this.currentViewBox = { minX: -10, minY: -10, width: this.width, height: this.viewport_height };
		if (this.root) {
			this.order_by_num_descendants();
			this.update_ypos();
			this.embed();
		}
		this.updateViewBox();
		this.fit_to_content();
		requestAnimationFrame(() => this.fit_to_content());

		if (typeof ResizeObserver !== 'undefined') {
			this._lastObservedW = this.width;
			this._lastObservedH = this.container.clientHeight || 0;
			this._resizeObserver = new ResizeObserver(() => {
				if (!this.container) return;
				const cw = this.container.clientWidth;
				const ch = this.container.clientHeight;
				if (cw > 0 && ch > 0 && (cw !== this._lastObservedW || ch !== this._lastObservedH)) {
					this._lastObservedW = cw;
					this._lastObservedH = ch;
					this.resize();
				}
			});
			this._resizeObserver.observe(this.container);
		}
	}

	update_tip_metadata(tip_metadata, preferred_field = null) {
		this.tip_labels = PhyloTreeSvg.metadata_by_field(tip_metadata);
		if (!this.tiplabel_select) return;
		const has_values = category => Object.values(this.tip_labels[category] || {})
			.some(v => v != null && v !== '' && v !== 'NA');
		const populated = Object.keys(this.tip_labels).filter(has_values);
		const label_categories = [this.id_label].concat(populated);
		const prev_val = this.tiplabel_select.value;
		this.tiplabel_select.innerHTML = '';
		for (const tiplabel of label_categories) {
			const opt = document.createElement('option');
			opt.value = tiplabel;
			opt.textContent = tiplabel;
			this.tiplabel_select.appendChild(opt);
		}
		const target = (preferred_field && populated.includes(preferred_field))
			? preferred_field
			: (label_categories.includes(prev_val) ? prev_val : (populated[0] || this.id_label));
		this.tiplabel_select.value = target;
		this.set_tiplabel(target);
	}

	destroy() {
		if (this._resizeObserver) {
			try { this._resizeObserver.disconnect(); } catch (e) {}
			this._resizeObserver = null;
		}
		if (this.glyph_tooltip_div && this.glyph_tooltip_div.parentNode) {
			this.glyph_tooltip_div.parentNode.removeChild(this.glyph_tooltip_div);
		}
		this.glyph_tooltip_div = null;
	}

	on(type, handler) {
		(this.listeners[type] = this.listeners[type] || []).push(handler);
		return this;
	}

	off(type, handler) {
		this.listeners[type] = (this.listeners[type] || []).filter(one => one !== handler);
		return this;
	}

	emit(type, detail) {
		for (const handler of this.listeners[type] || [])
			handler(detail);
	}

	static metadata_by_field(metadata) {
		const by_field = {};
		if (!metadata)
			return by_field;
		if (Array.isArray(metadata.columns) && Array.isArray(metadata.index) && Array.isArray(metadata.data)) {
			metadata.columns.forEach((field, column) => {
				by_field[field] = {};
				metadata.index.forEach((tip, row) => { by_field[field][tip] = metadata.data[row][column]; });
			});
			return by_field;
		}
		for (const [tip, fields] of Object.entries(metadata))
			for (const [field, value] of Object.entries(fields || {}))
				(by_field[field] = by_field[field] || {})[tip] = value;
		return by_field;
	}

	mousedown(truefalse, x, y) {
		if (truefalse) {
			const bbox = this.getContentBBox();
			const visible = this.visible_fraction();
			const totalRatioX = bbox ? Math.max(bbox.width / (this.width * (visible.x1 - visible.x0)), 1) : 1;
			const totalRatioY = bbox ? Math.max(bbox.height / (this.viewport_height * (visible.y1 - visible.y0)), 1) : 1;
			const zoomRatioX = this.currentViewBox.width / this.width;
			const zoomRatioY = this.currentViewBox.height / this.viewport_height;
			this.pan_scale_x = Math.sqrt(zoomRatioX * totalRatioX);
			this.pan_scale_y = Math.sqrt(zoomRatioY * totalRatioY);
		}
		if (!truefalse) 
			this.mousemove(x, y);
		this.mouseDownStatus = truefalse;
	}

	mousemove(x, y) {
		if (this.mouseDownStatus) {
			const deltaX = x - this.mouseX;
			const deltaY = y - this.mouseY;
			if (deltaX | deltaY)
				this.moveTree(deltaX, deltaY);
		}
		this.mouseX = x;
		this.mouseY = y;
	}

	moveTree(deltaX, deltaY) {
		if (!this.pan_zoom)
			return;
		this.currentViewBox.minX -= deltaX * (this.pan_scale_x || 1);
		this.currentViewBox.minY -= deltaY * (this.pan_scale_y || 1);
		this.clampViewBox();
		this.updateViewBox();
	}

	getContentBBox() {
		try {
			return this.svg.getBBox();
		} catch (e) {
			return null; // not rendered yet
		}
	}

	visible_fraction() {
		const whole = {x0: 0, x1: 1, y0: 0, y1: 1};
		const r = this.svg.getBoundingClientRect();
		if (!r.width || !r.height)
			return whole;
		let left = Math.max(r.left, 0), top = Math.max(r.top, 0);
		let right = Math.min(r.right, window.innerWidth || document.documentElement.clientWidth);
		let bottom = Math.min(r.bottom, window.innerHeight || document.documentElement.clientHeight);
		for (let el = this.svg.parentElement; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
			const style = window.getComputedStyle(el);
			if (style.overflowX === 'visible' && style.overflowY === 'visible')
				continue;
			const e = el.getBoundingClientRect();
			left = Math.max(left, e.left);
			right = Math.min(right, e.right);
			top = Math.max(top, e.top);
			bottom = Math.min(bottom, e.bottom);
		}
		if (right - left < 20 || bottom - top < 20)
			return whole;
		return {x0: (left - r.left) / r.width, x1: (right - r.left) / r.width,
				y0: (top - r.top) / r.height, y1: (bottom - r.top) / r.height};
	}

	zoomAtPoint(clientX, clientY, deltaY) {
		if (!this.pan_zoom)
			return;
		const bbox = this.getContentBBox();
		if (!bbox)
			return;

		const sbr = this.svg.getBoundingClientRect();
		const px = (clientX - sbr.left) / sbr.width;
		const py = (clientY - sbr.top) / sbr.height;
		const vx = this.currentViewBox.minX + px * this.currentViewBox.width;
		const vy = this.currentViewBox.minY + py * this.currentViewBox.height;

		const sensitivity = 0.0015;
		let zoomFactor = Math.min(Math.max(Math.exp(deltaY * sensitivity), 0.85), 1.15);

		const visible = this.visible_fraction();
		const visible_w = visible.x1 - visible.x0, visible_h = visible.y1 - visible.y0;
		const maxHeight = Math.max(bbox.height / visible_h, this.viewport_height);
		const maxWidth = Math.max(bbox.width / visible_w, this.width);
		const minHeight = this.delta_y * 6 / visible_h;

		if (zoomFactor > 1) {
			const factorLimit = Math.max(maxHeight / this.currentViewBox.height, maxWidth / this.currentViewBox.width);
			zoomFactor = Math.min(zoomFactor, factorLimit);
		} else if (zoomFactor < 1) {
			const factorLimit = minHeight / this.currentViewBox.height;
			zoomFactor = Math.max(zoomFactor, factorLimit);
		}
		if (Math.abs(zoomFactor - 1) < 1e-6)
			return;

		const newWidth = this.currentViewBox.width * zoomFactor;
		const newHeight = this.currentViewBox.height * zoomFactor;
		this.currentViewBox.width = newWidth;
		this.currentViewBox.height = newHeight;
		this.currentViewBox.minX = vx - px * newWidth;
		this.currentViewBox.minY = vy - py * newHeight;
		this.clampViewBox();
		this.updateViewBox();
	}

	body_height() {
		return Math.max((this.container.clientHeight || 466) - (this.owns_header ? this.infoPanel.offsetHeight : 0), 60);
	}

	resize() {
		if (!this.container || !this.svg || !this.treePanel)
			return;
		const width = this.container.clientWidth;
		if (!width)
			return;
		this.width = width;
		this.treePanel.style.width = '100%';
		this.treePanel.style.height = this.body_height() + 'px';
		this.viewport_height = this.treePanel.clientHeight || 400;
		this.svg.setAttribute('style', `background-color: white; font-size: 12px; display: block; `
			+ `width: 100%; height: ${this.viewport_height}px`);
		this.currentViewBox = {minX: -10, minY: -10, width: this.width, height: this.viewport_height};
		this.embed();
		this.fit_to_content();
	}

	fit_to_content() {
		if (!this.currentViewBox)
			return;
		const bbox = this.getContentBBox();
		if (!bbox || !bbox.width || !bbox.height)
			return;
		const margin = 8;
		const vb = this.currentViewBox;
		vb.width = Math.max(this.width, bbox.width + 2 * margin);
		vb.height = Math.max(this.viewport_height, bbox.height + 2 * margin);
		vb.minX = bbox.x + bbox.width / 2 - vb.width / 2;
		vb.minY = bbox.y + bbox.height / 2 - vb.height / 2;
		this.updateViewBox();
	}

	set_pan_zoom(on) {
		this.pan_zoom = !!on;
		this.mouseDownStatus = false;
		this.svg.style.cursor = this.pan_zoom ? 'grab' : '';
		if (!this.pan_zoom)
			this.fit_to_content();
		return this.pan_zoom;
	}

	clampViewBox() {
		const bbox = this.getContentBBox();
		if (!bbox)
			return;
		const visible = this.visible_fraction();
		const vb = this.currentViewBox;
		const offsetX = visible.x0 * vb.width, sizeX = (visible.x1 - visible.x0) * vb.width;
		const offsetY = visible.y0 * vb.height, sizeY = (visible.y1 - visible.y0) * vb.height;
		const marginFraction = 0.05;
		const marginX = sizeX * marginFraction;
		const marginY = sizeY * marginFraction;
		vb.minX = this.clampAxis(vb.minX + offsetX, bbox.x - marginX, bbox.x + bbox.width + marginX, sizeX) - offsetX;
		vb.minY = this.clampAxis(vb.minY + offsetY, bbox.y - marginY, bbox.y + bbox.height + marginY, sizeY) - offsetY;
	}

	clampAxis(value, contentMin, contentMax, viewportSize) {
		const lo = Math.min(contentMin, contentMax - viewportSize);
		const hi = Math.max(contentMin, contentMax - viewportSize);
		return Math.min(Math.max(value, lo), hi);
	}

	updateViewBox() {
		const { minX, minY, width, height } = this.currentViewBox;
		this.svg.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);
	}

	zoomViewBox(zoomFactor) {
		this.currentViewBox.width *= (1 + zoomFactor);
		this.currentViewBox.height *= (1 + zoomFactor);
		this.updateViewBox();
	}

	adjustHeight(zoomProp) {
		this.delta_y *= zoomProp;
		this.height = this.delta_y * this.tips.length;
		this.svg.style.height = this.height + this.delta_y*2;
		this.updateViewBox();
		this.update_ypos();
		this.embed();
	}

	zoomX(zoomProp) {
		this.tree_width_prop *= zoomProp;
		this.embed();
	}

	zoom(zoomLevel) {
		const transform = `scale(${zoomLevel})`;
		this.svg.setAttribute('transform', transform);
	}

	set_tiplabel(category) {
		this.label_field = category in this.tip_labels ? category : null;
		for (const tip of this.tips) {
			if (category in this.tip_labels && tip.id in this.tip_labels[category] && this.tip_labels[category][tip.id]) {
				tip.set_label(this.tip_labels[category][tip.id]);
			} else {
				tip.set_label(tip.id);
			}
		}
		this.fit_to_content();
	}

	update_ypos() {
		// based on tip order and delta_y
		for (const node of this.tips) {
			node.update_ypos();
			node.set_depth_from_children();
		}
		for (const node of this.internal_nodes.slice().reverse()) {
			node.update_ypos();
			node.set_depth_from_children();
		}
	}
	
	embed() {
		const maxDepth = (this.root && this.root.depth > 0) ? this.root.depth : 1;
		this.x_scale = (this.width / maxDepth) * this.tree_width_prop;
		this.topNode = null;
		this.minNodeY = 0;
		this.maxNodeY = 0;
		for (const node_id in this.node_by_id) {
			const node = this.node_by_id[node_id];
			node.embed();
		}

		this.topNode = this.root.get_descendant_right();
		this.minNodeY = (this.topNode.getClientPos().y);
		const bottomNode = this.root.get_descendant_left();
		this.maxNodeY = bottomNode.getTranslatedPos().y + 10;
		this.currentViewBox.minY = 0;
		this.currentViewBox.minX = -10;
	}

	reportTransformation(x=0, y=0) {
		if (!this.debug) return;
		const pt = new DOMPoint(x, y);
		const ctm = this.svg.getCTM();
		if (!ctm) return;
		const transformedPt = pt.matrixTransform(ctm);
		console.log(`point(${x}, ${y}) transformed: ${transformedPt.x}, ${transformedPt.y}`);
	}

	shiftX(delta) {
		this.x_shift_val += delta;
		this.root.shift_x(this.x_shift_val);
	}

	update_tree_width_prop(value) {
		if ((value > 1) | (value < 0)) {
			return;
		}
		this.tree_width_prop = value;
		this.embed();
		this.fit_to_content();
	}

	update_selection_class() {
		if (!this.svg) return;
		const hasSel = Boolean(this.branch_highlight || (this.focus_tips && this.focus_tips.length > 0));
		this.svg.classList.toggle('has_selection', hasSel);
	}

	highlight_branch(node_id=null) {
		if (this.branch_highlight && this.node_by_id[this.branch_highlight]) {
			this.node_by_id[this.branch_highlight].highlight_branch(false);
			if (this.node_highlight_mode & PhyloTreeSvg.Descendants) {
				const des_nodes = [];
				this.node_by_id[this.branch_highlight].get_descendant_nodes(des_nodes);
				for (const node of des_nodes) {
					node.highlight_branch(false);
				}
			}
		}
		if (node_id == this.branch_highlight) {
			this.branch_highlight = null;
			this.update_selection_class();
			this.show_branch_selected_info(null);
			return false; //toggle branch that is already highlighted
		}
		if (node_id && this.node_by_id[node_id]) {
			const node = this.node_by_id[node_id];
			if (this.node_highlight_mode & PhyloTreeSvg.Ancestor)
				node.highlight_branch(true);
			if (this.node_highlight_mode & PhyloTreeSvg.Descendants) {
				const des_nodes = [];
				node.get_descendant_nodes(des_nodes);
				for (const des_node of des_nodes) {
					des_node.highlight_branch(true);
				}
			}
			this.branch_highlight = node_id;
			this.update_selection_class();
			this.show_branch_selected_info(node_id);
			return true;
		}
		this.branch_highlight = null;
		this.update_selection_class();
		this.show_branch_selected_info(null);
		return false;
	}

	show_branch_selected_info(node_id, force = false) {
		if (this.announce_selection || force)
			this.set_legend(node_id ? `Branch to ${node_id} selected.` : '');
	}

	create_glyph_tooltip() {
		const tooltip = document.createElement('div');
		tooltip.style.cssText = 'position:fixed; display:none; z-index:10000; pointer-events:none; white-space:pre-line; ' +
			'background-color:#1e293b; border-radius:6px; padding:6px 10px; font-size:11px; ' +
			'line-height:1.4; max-width:260px; box-shadow:0 2px 8px rgba(0,0,0,0.35); color:#f8fafc;';
		document.body.appendChild(tooltip);
		return tooltip;
	}

	show_glyph_tooltip(e, text) {
		if (!this.glyph_tooltip_div) return;
		this.glyph_tooltip_div.textContent = text;
		this.glyph_tooltip_div.style.display = 'block';
		this.position_glyph_tooltip(e);
	}

	position_glyph_tooltip(e) {
		const tip = this.glyph_tooltip_div;
		if (!tip) return;
		const left = Math.min(e.clientX + 12, window.innerWidth - tip.offsetWidth - 4);
		const top = Math.min(e.clientY + 12, window.innerHeight - tip.offsetHeight - 4);
		tip.style.left = Math.max(left, 4) + 'px';
		tip.style.top = Math.max(top, 4) + 'px';
	}

	hide_glyph_tooltip() {
		if (this.glyph_tooltip_div)
			this.glyph_tooltip_div.style.display = 'none';
	}

	make_glyph(style, tooltip_text) {
		const glyph = document.createElement('span');
		glyph.style.cssText = `display:inline-block; margin-right:3px; vertical-align:middle; cursor:help; ${style}`;
		glyph.addEventListener('mouseenter', (e) => this.show_glyph_tooltip(e, tooltip_text));
		glyph.addEventListener('mousemove', (e) => this.position_glyph_tooltip(e));
		glyph.addEventListener('mouseleave', () => this.hide_glyph_tooltip());
		return glyph;
	}

	key_text(text) {
		const span = document.createElement('span');
		span.textContent = ' ' + text;
		span.title = text;
		return span;
	}

	dot_glyph(color, tooltip_text) {
		return this.make_glyph(`width:8px; height:8px; border-radius:50%; background:${color}; border:1px solid #1e293b;`, tooltip_text);
	}

	legend_glyph(entry) {
		switch (entry.glyph) {
			case 'present': return this.dot_glyph('#2ca02c', entry.text);
			case 'multi': return this.dot_glyph('#ff7f0e', entry.text);
			case 'event': return this.dot_glyph('#d500f9', entry.text);
			case 'anchor': return this.dot_glyph('#2e7d32', entry.text);
			case 'other': return this.dot_glyph('#0288d1', entry.text);
			case 'empty': return this.make_glyph('width:6px; height:6px; border-radius:50%; border:1.5px solid #64748b; background:white;', entry.text);
			case 'unknown': return this.make_glyph('width:6px; height:6px; border-radius:50%; border:1px dashed #777;', entry.text);
		}
		return null;
	}

	set_legend(title, entries = PhyloTreeSvg.DEFAULT_LEGEND) {
		this.discrete_info_row.innerHTML = '';
		if (!title) {
			this.discrete_info_row.innerHTML = '<span style="color:#64748b; font-style:italic;">Click branch/tip to highlight clade on graph</span>';
			return;
		}
		for (const entry of entries || []) {
			const glyph = this.legend_glyph(entry);
			if (glyph)
				this.discrete_info_row.appendChild(glyph);
		}
		this.discrete_info_row.appendChild(this.key_text(title));
	}

	set_node_states(states, {title = '', legend = PhyloTreeSvg.DEFAULT_LEGEND, tooltips = null,
							 probabilities = null, show_counts = false} = {}) {
		this.clear_node_states();
		if (!states)
			return;
		for (const [node_id, raw_state] of Object.entries(states || {})) {
			const node = this.node_by_id[node_id];
			if (!node)
				continue;
			const state = (raw_state && typeof raw_state === 'object' && typeof raw_state.count !== 'undefined')
				? raw_state.count
				: raw_state;
			if (show_counts && typeof state === 'number')
				node.set_data(state);
			node.set_present_absent(state === 'present' ? 1 : state === 'multi' ? 2 : state);
			if (tooltips && tooltips[node_id])
				node.set_gene_tooltip(tooltips[node_id]);
		}
		for (const [node_id, p] of Object.entries(probabilities || {})) {
			const node = this.node_by_id[node_id];
			if (node)
				node.set_probability(p);
		}
		this.node_states_shown = true;
		this.set_legend(title, legend);
	}

	clear_node_states() {
		if (this.node_states_shown) {
			for (const node of Object.values(this.node_by_id)) {
				if (node.dataDisplay)
					node.set_data('');
				node.set_present_absent(0);
				node.set_gene_tooltip(null);
			}
			this.node_states_shown = false;
		}
		this.set_legend('');
	}

	set_quantity_info(text) {
		this.quantity_info_row.innerHTML = '';
		if (!text) {
			this.quantity_info_row.style.display = 'none';
			return;
		}
		this.quantity_info_row.style.display = 'block';
		this.quantity_info_row.appendChild(this.make_glyph(
			'width:16px; height:8px; border-radius:50%; background:#ff7f0e; border:1px solid #c2410c;',
			'Orange ellipse: width is proportional to the count relative to the maximum tip'));
		this.quantity_info_row.appendChild(this.key_text(text));
	}

	get_descendant_tip_ids(node_id) {
		const node = this.node_by_id[node_id];
		if (!node)
			return [];
		const tip_ids = new Set(node.child_nodes.length ? [] : [node_id]);
		if (node.child_nodes.length) {
			const des_nodes = [];
			node.get_descendant_nodes(des_nodes);
			for (const des_node of des_nodes)
				if (!des_node.child_nodes.length)
					tip_ids.add(des_node.id);
		}
		return this.get_tip_ids_in_display_order().filter(id => tip_ids.has(id));
	}

	set_node_marks(marks) {
		this.clear_node_marks();
		this.node_marks = [];
		for (const mark of marks || []) {
			const node = this.node_by_id[mark.node];
			if (!node || !node.group)
				continue;
			const size = 5.5;
			const x = -9;
			const glyph = document.createElementNS(ns, 'path');
			glyph.setAttribute('d', `M${x},${-size} L${x + size},0 L${x},${size} L${x - size},0 Z`);
			glyph.setAttribute('class', 'coalition_mark' + (mark.hollow ? ' ancestral' : ''));
			glyph.setAttribute('fill', mark.hollow ? 'white' : mark.color);
			glyph.setAttribute('stroke', mark.color);
			if (mark.selected)
				glyph.classList.add('selected');
			const title = document.createElementNS(ns, 'title');
			title.textContent = mark.title || '';
			glyph.appendChild(title);
			glyph.onclick = event => {
				event.stopPropagation();
				if (mark.action)
					mark.action();
			};
			node.group.appendChild(glyph);
			this.node_marks.push(glyph);
		}
	}

	clear_node_marks() {
		for (const glyph of this.node_marks || [])
			if (glyph.parentNode)
				glyph.parentNode.removeChild(glyph);
		this.node_marks = [];
	}

	search_tips(text) {
		for (const tip of this.search_hits || [])
			if (tip.labelDisplay)
				tip.labelDisplay.classList.remove('tip_search_hit');
		this.search_hits = [];
		this.search_hit_index = -1;
		const query = (text || '').trim().toLowerCase();
		if (query.length >= 2) {
			const fields = (this.search_fields || (this.label_field ? [this.label_field] : Object.keys(this.tip_labels)))
				.map(field => this.tip_labels[field] || {});
			for (const tip of this.tips) {
				if (String(tip.id).toLowerCase().includes(query)
					|| fields.some(values => String(values[tip.id] != null ? values[tip.id] : '').toLowerCase().includes(query))) {
					this.search_hits.push(tip);
					if (tip.labelDisplay)
						tip.labelDisplay.classList.add('tip_search_hit');
				}
			}
		}
		this.search_count.textContent = query.length >= 2 ? `${this.search_hits.length} hit${this.search_hits.length === 1 ? '' : 's'}` : '';
		return this.search_hits.length;
	}

	highlight_tips(genome_ids) {
		for (const tip of this.highlighted_tips || [])
			if (tip.labelDisplay)
				tip.labelDisplay.classList.remove('tip_highlight');
		this.highlighted_tips = [];
		if (!genome_ids)
			return;
		for (const id of genome_ids) {
			const tip = this.node_by_id[id];
			if (tip && tip.labelDisplay) {
				tip.labelDisplay.classList.add('tip_highlight');
				this.highlighted_tips.push(tip);
			}
		}
	}

	set_focus_tips(genome_ids) {
		for (const tip of this.focus_tips || [])
			if (tip.labelDisplay)
				tip.labelDisplay.classList.remove('tip_focus');
		this.focus_tips = [];
		for (const id of genome_ids || []) {
			const tip = this.node_by_id[id];
			if (tip && tip.labelDisplay) {
				tip.labelDisplay.classList.add('tip_focus');
				this.focus_tips.push(tip);
			}
		}
		this.update_selection_class();
	}

	show_next_search_hit() {
		if (!this.search_hits || !this.search_hits.length)
			return;
		this.search_hit_index = (this.search_hit_index + 1) % this.search_hits.length;
		this.scroll_to_node(this.search_hits[this.search_hit_index]);
		this.search_count.textContent = `${this.search_hit_index + 1}/${this.search_hits.length}`;
	}

	scroll_to_node(node) {
		let x = 0, y = 0;
		for (let n = node; n; n = n.get_parent()) {
			const transform = n.group && n.group.transform.baseVal[0];
			if (transform) {
				x += transform.matrix.e;
				y += transform.matrix.f;
			}
		}
		const visible = this.visible_fraction();
		const vb = this.currentViewBox;
		vb.minY = y - vb.height * (visible.y0 + visible.y1) / 2;
		if (x > vb.minX + vb.width * visible.x1 || x < vb.minX + vb.width * visible.x0)
			vb.minX = x - vb.width * (visible.x0 + 0.8 * (visible.x1 - visible.x0));
		this.clampViewBox();
		this.updateViewBox();
	}

	jump_to_tip(genome_id) {
		const tip = this.node_by_id[genome_id];
		if (!tip)
			return;
		this.scroll_to_node(tip);
		this.highlight_branch(genome_id);
	}

	hover_tip(genome_id, on) {
		if (genome_id === this.branch_highlight)
			return;
		const node = this.node_by_id[genome_id];
		if (node)
			node.highlight_branch(on);
	}

	clear_tip_quantities() {
		if (this.quantity_display) {
			this.quantity_display = false;
			for (const tip of this.tips)
				tip.show_quantity(0);
		}
		this.set_quantity_info('');
	}

	set_tip_quantities(values, {title = '', label = '', max = 0, tooltip = value => String(value)} = {}) {
		if (!values || Object.keys(values).length === 0) {
			this.clear_tip_quantities();
			return;
		}
		const tooltip_text = tooltip;
		values = {...values};
		this.quantity_display = true;
		let qmax = max > 0 ? max : 0;
		for (const tip_id of Object.keys(values)) {
			if (!Number.isFinite(values[tip_id]))
				values[tip_id] = 0;
			if (values[tip_id] > qmax)
				qmax = values[tip_id];
		}
		for (const tip of this.tips) {
			const val = values[tip.id] || 0;
			const prop_max = qmax ? val / qmax : 0;
			tip.show_quantity(prop_max, 36, tooltip_text(val));
		}
		this.set_quantity_info(title || label);
	}
}
PhyloTreeSvg.Ancestor = 1;
PhyloTreeSvg.Descendants = 2;
PhyloTreeSvg.Tips = 4;
PhyloTreeSvg.DEFAULT_LEGEND = [
	{glyph: 'present', text: 'Green dot: present (single copy)'},
	{glyph: 'multi', text: 'Orange dot: present in multiple copies'},
	{glyph: 'empty', text: 'Open circle: absent (0 copies)'}
];

class PhyloNodeSvg extends PhyloNodeBase {
	constructor(params) {
		super(params, false);
		this.class = "phylonode_svg";
		this.ypos = 0;
		this.depth = 0;  // distance to farthest descendant tip
		this.group = document.createElementNS(ns, "g");
		this.group.dataset.nodeId = this.id;
		this.group.setAttribute("y", 0);
		this.group.classList.add('subtree');
		this.group.classList.add('tip');

		const transform = this.tree.svg.createSVGTransform();
		this.group.transform.baseVal.initialize(transform);

		this.marker = this.make_marker('circle');

		this.branch = document.createElementNS(ns, "path");
		this.branch.classList.add('branch');
		this.branch.dataset.nodeId = this.id;
		this.branch.onclick = () => this.tree.emit('node-click', {node_id: this.id});
		this.branch.addEventListener('mouseenter', () => this.tree.emit('node-hover', {node_id: this.id, on: true}));
		this.branch.addEventListener('mouseleave', () => this.tree.emit('node-hover', {node_id: this.id, on: false}));
		this.group.appendChild(this.branch);
		this.group.appendChild(this.marker);
	}

	make_marker(tag) {
		const el = document.createElementNS(ns, tag);
		el.dataset.nodeId = this.id;
		el.classList.add('node_marker');
		if (tag === 'circle') {
			el.setAttribute('cx', '0');
			el.setAttribute('cy', '0');
		}
		el.onclick = () => this.tree.emit('node-click', {node_id: this.id});
		el.addEventListener('mouseenter', (e) => {
			if (el.dataset.tooltip)
				this.tree.show_glyph_tooltip(e, el.dataset.tooltip);
			this.tree.emit('node-hover', {node_id: this.id, on: true});
		});
		el.addEventListener('mousemove', (e) => {
			if (el.dataset.tooltip)
				this.tree.position_glyph_tooltip(e);
		});
		el.addEventListener('mouseleave', () => {
			this.tree.hide_glyph_tooltip();
			this.tree.emit('node-hover', {node_id: this.id, on: false});
		});
		return el;
	}

	use_internal_marker() {
		const square = this.make_marker('rect');
		square.classList.add('internal');
		const side = PhyloNodeSvg.INTERNAL_MARKER_SIDE;
		square.setAttribute('x', -side / 2);
		square.setAttribute('y', -side / 2);
		square.setAttribute('width', side);
		square.setAttribute('height', side);
		if (this.marker.dataset.tooltip)
			square.dataset.tooltip = this.marker.dataset.tooltip;
		for (const name of this.marker.classList)
			square.classList.add(name);
		this.group.replaceChild(square, this.marker);
		this.marker = square;
	}

	append_child(node) {
		if (!this.child_nodes.length)
			this.use_internal_marker();
		this.child_nodes.push(node);
		this.group.appendChild(node.group);
		this.group.appendChild(this.marker);
		this.group.classList.remove('tip');
		node.parent_node = this;
	}

	set_id(new_id) {
		this.id = new_id;
		if (this.group)
			this.group.dataset.nodeId = new_id;
		if (this.marker)
			this.marker.dataset.nodeId = new_id;
		if (this.branch)
			this.branch.dataset.nodeId = new_id;
	}

	add_label_slot() {
		if (!this.group || this.labelDisplay) 
			return;
		this.labelDisplay = document.createElementNS(ns, 'text');
		this.labelDisplay.style.position = 'relative';
		this.labelDisplay.setAttribute('dx', 8);
		this.labelDisplay.setAttribute('dy', 3.5); 
		this.labelDisplay.textContent = this.id;
		this.labelDisplay.onclick = () => this.tree.emit('node-click', {node_id: this.id});
		this.labelDisplay.addEventListener('mouseenter', (e) => {
			if (this.marker && this.marker.dataset.tooltip)
				this.tree.show_glyph_tooltip(e, this.marker.dataset.tooltip);
			this.tree.emit('node-hover', {node_id: this.id, on: true});
		});
		this.labelDisplay.addEventListener('mousemove', (e) => {
			if (this.marker && this.marker.dataset.tooltip)
				this.tree.position_glyph_tooltip(e);
		});
		this.labelDisplay.addEventListener('mouseleave', () => {
			this.tree.hide_glyph_tooltip();
			this.tree.emit('node-hover', {node_id: this.id, on: false});
		});
		this.group.appendChild(this.labelDisplay);
	}

	set_label(label) {
		if (!this.group) return;
		if (!this.labelDisplay) 
			this.add_label_slot();
		this.labelDisplay.textContent = label;
	}

	add_data_slot() {
		if (!this.group || this.dataDisplay) return;
		this.dataDisplay = document.createElementNS(ns, 'text');
		this.dataDisplay.setAttribute('dx', '-9');
		this.dataDisplay.setAttribute('dy', '3');
		this.dataDisplay.style.fontSize = '10px';
		this.dataDisplay.style.fontWeight = 'bold';
		this.group.appendChild(this.dataDisplay);
	}

	highlight_branch(onoff = false) {
		if (onoff) {
			this.branch.classList.add('branch_highlight');
			if (this.labelDisplay) 
				this.labelDisplay.classList.add('branch_highlight');
		}
		else {
			this.branch.classList.remove('branch_highlight');
			if (this.labelDisplay) 
				this.labelDisplay.classList.remove('branch_highlight');
		}
	}

	show_quantity(proportion, max_extent = 36, tooltip_text = null) {
		if (proportion > 0) {
			if (!this.qDisplay) {
				this.qDisplay = document.createElementNS(ns, 'ellipse');
				this.qDisplay.setAttribute("cy", 0);
				this.qDisplay.setAttribute("ry", this.tree.delta_y * 0.45);
				this.qDisplay.classList.add('quantity');
				this.group.appendChild(this.qDisplay);
			}
			const half_extent = max_extent * proportion * 0.5;
			this.qDisplay.setAttribute("cx", half_extent);
			this.qDisplay.setAttribute("rx", half_extent);
			this.qDisplay.classList.remove("invisible");
			let title = this.qDisplay.querySelector('title');
			if (!title) {
				title = document.createElementNS(ns, 'title');
				this.qDisplay.appendChild(title);
			}
			title.textContent = tooltip_text || '';
		}
		else {
			if (this.qDisplay) {
				this.qDisplay.classList.add("invisible");
			}
		}
	}

	set_probability(p) {
		this.set_present_absent(p >= 0.1 ? 1 : 0);
		if (p >= 0.1)
			this.marker.style.fillOpacity = p;
	}

	set_data(display_text) {
		if (!this.group) return;
		if (!this.dataDisplay) 
			this.add_data_slot();
		if (typeof display_text === 'undefined' || display_text === null) 
			display_text = '';
		else if ((display_text == '0') | (display_text == '1'))
			display_text = '';
		this.dataDisplay.setAttribute('fill', '#c2410c');
		this.dataDisplay.textContent = display_text;
	}

	set_present_absent(state) {
		this.marker.classList.remove("present", "absent", "multi", "event", "anchor", "unknown", "other", "empty");
		this.marker.style.fillOpacity = '';
		if (state === null || state === 'unknown') {
			this.marker.classList.add("unknown");
			return;
		}
		if (state === 'event') {
			this.marker.classList.add("event");
			return;
		}
		if (state === 'anchor') {
			this.marker.classList.add("anchor");
			return;
		}
		if (state === 'other') {
			this.marker.classList.add("other");
			return;
		}
		if (state === 'empty') {
			this.marker.classList.add("empty");
			return;
		}
		if (state === 'no_region') {
			this.marker.classList.add("absent");
			return;
		}
		const x = parseFloat(state);
		if (x == 0) 
			this.marker.classList.add("absent");
		else if (x == 1) 
			this.marker.classList.add("present");
		else if (x > 1)
			this.marker.classList.add("multi");
	}

	set_gene_tooltip(text) {
		if (text)
			this.marker.dataset.tooltip = text;
		else
			delete this.marker.dataset.tooltip;
	}

	update_ypos() {
		if (!this.group) return;
		if (this.child_nodes.length) {
			let new_ord = 0;
			let num_valid_children = 0;
			for (const child of this.child_nodes) {
				if (child.ordinal === child.ordinal) {
					new_ord += child.ordinal;
					num_valid_children++;
				}
			}
			this.ordinal = new_ord / num_valid_children;
		}
		this.ypos = this.ordinal * this.tree.delta_y;
	}

	embed() { 
		const path_length = this.branch_length * this.tree.x_scale;
		let d = "M0,0 h-" + path_length;
		this.group.transform.baseVal[0].matrix.e = path_length;
		if (this.parent_node) {
			const delta_y = this.ypos - this.parent_node.ypos;
			this.group.transform.baseVal[0].matrix.f = delta_y;
			d = d + " V " + -delta_y;
		}
		this.branch.setAttribute('d', d);
	}
	
	getTranslatedPos() {
		const point = new DOMPoint(0, 0);
		var ctm = this.group.getCTM();
		return ctm ? point.matrixTransform(ctm) : point;
	}

	getClientPos() {
		const rect = this.group.getBoundingClientRect();
		return new DOMPoint(rect.x, rect.y);
	}

	getBBox() {
		return this.group.getBBox();
	}
}
PhyloNodeSvg.color_palette = ['#ffab00', '#a6001a', '#ffab00', '#00477e', '#e06000', '#633517', '#ee9600'];
PhyloNodeSvg.INTERNAL_MARKER_SIDE = 6;

global.PhyloTreeSvg = PhyloTreeSvg;
global.PhyloNodeSvg = PhyloNodeSvg;
return {
	PhyloTreeSvg: PhyloTreeSvg,
	PhyloNodeSvg: PhyloNodeSvg,
	PhyloTreeBase: PhyloTreeBase,
	PhyloNodeBase: PhyloNodeBase
};
});
