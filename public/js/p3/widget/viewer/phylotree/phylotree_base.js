(function(root, factory) {
	if (typeof define === 'function' && define.amd) {
		define([], function() {
			return factory(root);
		});
	} else {
		factory(root);
	}
})(typeof window !== 'undefined' ? window : globalThis, function(global) {
function* enumerate(iterable) {
	let i = 0;
	for (const x of iterable) {
		yield([i, x]);
		i++;
	}
}
function is_integer(value) {
	return !isNaN(value) && (function(x) { return (x | 0) === x; })(parseFloat(value));
}

class PhyloTreeBase {
	constructor(newick) {
		if (PhyloTreeBase.debug) console.log("new PhyloTreeBase");
		this.newick = newick;
		this.root = null;
		this.nodes = [];
		this.tips = [];
		this.tip_ids = [];
		this.internal_nodes = [];
		this.stop_rank = undefined;
		this.node_by_id = {};
		this.tip_labels = {};
	}

	createNode(node_params) {
		return new PhyloNodeBase(node_params);
	}

	parse_newick(start=0, parent_node=null, nodes_labeled=false) {
		// read from global this.newick string
		if (PhyloTreeBase.debug) console.log("parse_newick(" + start + ")");
		let num_tips = 0;
		let node_num = 1;
		let going_down = false;
		let cur_node;
		let nest_level = 0;
		let prev_i = start - 1;
		const end = this.newick.length;
		let in_tree = true;
		for (let index = start; in_tree & (index < end); index++) {
			const tree_char = this.newick.charAt(index);
			if (PhyloTreeBase.debug > 9)
				console.log(`index=${index}, end=${end}, char=${tree_char}, nest=${nest_level}`);
			if (index <= prev_i) {
				throw("index is too low");
			}
			prev_i = index;
			if (tree_char == ')') {
				nest_level--;
				going_down = true;
				let in_squote = false;
				// read past any trailing node label or branch length (already processed)
				for (index; index < end; index++) {
					const cur_char = this.newick.charAt(index+1);
					if (cur_char == "'") { //handle single quotes
						in_squote = !in_squote;
					}
					if (!in_squote & [',', ')', ';'].indexOf(cur_char) >= 0) {
						//update index to just before the next significant symbol
						if (cur_char == ';')
							in_tree = false;
						break;
					}
				}
			}
			else if (tree_char == ',') {
				going_down = true;
			}
			else if (tree_char == ';') {
				going_down = true;
			}
			else if (tree_char == ' ') {
				// ignore whitespace
			}
			else { // must be making of a new node -- either terminal or internal
				let is_tip = true;
				let start_node_info_pos = index;
				if (PhyloTreeBase.debug > 100)
					console.log('start new node (or origin) ');
				if (tree_char == '(') {
					is_tip = false;
					nest_level++;
					let temp_nest_level = 1;
					for (start_node_info_pos = index+1; start_node_info_pos < end; start_node_info_pos++) {
						const cur_char = this.newick.charAt(start_node_info_pos);
						if (cur_char == '(') 
							temp_nest_level++;
						else if (cur_char == ')')
							temp_nest_level--;
						if (temp_nest_level == 0) {
							start_node_info_pos++;
							break;
						}
					}
				}
				let in_squote = false;
				for (var end_node_info_pos = start_node_info_pos; end_node_info_pos < end; end_node_info_pos++) {
					const cur_char = this.newick.charAt(end_node_info_pos);
					if (cur_char == "'") { //handle single quotes
						in_squote = !in_squote;
					}
					else if (!in_squote) {
						if ([',', '(', ')', ';'].indexOf(cur_char) >= 0) {
							break;
						}
					}
				}

				let node_id = this.newick.substring(start_node_info_pos, end_node_info_pos);
				if (PhyloTreeBase.debug > 100)
					console.log("node info: " + node_id);
				let branch_length = 0;
				// A branch length is any number newick may carry: an integer (":1"), a decimal, or one in
				// scientific notation (":4.637603007105585e-05"), optionally signed.
				let matchResult = node_id.match(/(.*):([-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)$/);
				if (matchResult) {
					branch_length = parseFloat(matchResult[2]);
					node_id = matchResult[1];
					if (PhyloTreeBase.debug > 100)
						console.log('bl regex result: ' + branch_length + ", label=" + node_id);
				}
				let support = 0.0;
				node_id = node_id.replace(/^'|'$/g, ''); // strip off quotes
				if ((!is_tip) & (!nodes_labeled)) { // if not tip, label may be support value - if it is a number -- unless nodes_labeled, treat numbers as labels
					matchResult = node_id.match(/^([\d.]+)(.*)/);
					if (matchResult) {
						if (PhyloTreeBase.debug > 100)
							console.log('sup regex result: ' + matchResult);
						support = parseFloat(matchResult[1]);
						node_id = matchResult[2];
						node_id = node_id.replace(/^:/, '');
					}
				}
				let rank = '';
				matchResult = node_id.match(/(\w)__/);
				if (matchResult) {
					if (PhyloTreeBase.debug > 1)
						console.log('rank regex result: ' + matchResult);
					rank = matchResult[1];
				}
				node_id = node_id.trim();
				if (node_id.length == 0) {
					if (this.root)
						node_id = "inner_" + node_num; //create a unique id
					else 
						node_id = 'root';
				}

				const node_params = {tree: this, node_id: node_id, branch_length: branch_length, support: support};
				const new_node = this.createNode(node_params);

				if (cur_node) {
					cur_node.append_child(new_node);
				}
				if (!this.root) {
					this.root = new_node;
				}
				this.node_by_id[node_id] = new_node;
				this.nodes.push(new_node);
				cur_node = new_node;

				if ((this.stop_rank != '') & (this.stop_rank == rank)) {
					if (PhyloTreeBase.debug)
						console.log("hit stop rank " + rank);
					is_tip = true;
					cur_node.set_newick_start(index+1);
				}
				if (is_tip) {
					cur_node.set_ordinal(num_tips);
					num_tips++;
					index = end_node_info_pos - 1; // move index into newick string to end (skip internal taxa, possibly)
					this.tips.push(cur_node);
				}
				else {
					this.internal_nodes.push(cur_node); //maintain ordered list of internal nodes
					node_num++;
				}
			}
			if (going_down) {
				if (in_tree) {
					if (!cur_node.parent_node && PhyloTreeBase.debug) {
						console.log(" cannot go down from " + cur_node.id + ", parent is null");
					}
					cur_node = cur_node.parent_node;
					going_down = false;
				}
			}
		}
		this.internal_nodes.sort(PhyloNodeBase.compare_phylonodes_by_num_descendants);
		if (PhyloTreeBase.debug)
			console.log("newick parsed, num tips = " + this.tips.length + ", num nodes = " + this.nodes.length);
	}

	get_internal_node_dict_keyed_by_tip_ids() {
		let retval = {};
		for (const tip of this.tips) {
			tip.set_min_descendant();
		}
		for (const node of this.internal_nodes.toReversed()) {
			node.set_min_descendant();
			const min_descendant_tuple = node.get_min_descendant_tuple();
			retval[min_descendant_tuple] = node;
		}
		return retval;
	}

	transfer_internal_node_ids(labeled_tree_newick_string) {
		const named_tree = new PhyloTreeBase(labeled_tree_newick_string);
		named_tree.parse_newick(0, null, true);
		const named_tree_node_dict = named_tree.get_internal_node_dict_keyed_by_tip_ids();
		const this_node_dict = this.get_internal_node_dict_keyed_by_tip_ids();

		for (const min_tuple of Object.keys(named_tree_node_dict)) {
			const that_node = named_tree_node_dict[min_tuple];
			const this_node = this_node_dict[min_tuple];
			if (!this_node) continue;
			this.node_by_id[that_node.id] = this_node;
			delete this.node_by_id[this_node.id];
			this_node.set_id(that_node.id);
		}
	}

	get_node_ids() {
		return Object.keys(this.node_by_id);
	}

	get_tip_ids() {
		const retval = [];
		for (const tip of this.tips)
			retval.push(tip.id);
		return retval;
	}

	get_tip_ids_in_display_order() {
		// this.tips is in newick-parse order; .ordinal (set by order_by_num_descendants) is what
		// actually determines current top-to-bottom display position
		const ordered = this.tips.slice().sort((a, b) => a.ordinal - b.ordinal);
		return ordered.map(tip => tip.id);
	}

	get_node_ancestor(node_id) {
		// return id of ancestor of indicated node, if any
		let anc = this.node_by_id[node_id] && this.node_by_id[node_id].get_parent();
		if (anc) {
			return anc.id;
		}
	}

	order_by_num_descendants(increasing=true) {
		for (const node of this.tips) {
			node.calc_num_descendants();
		}
		for (const node of this.internal_nodes.slice().reverse()) {
			node.calc_num_descendants();
			node.order_children_by_num_descendants(increasing);
		}
		this.internal_nodes = []; // start with empty list, fill from bottom up 
		const nodes_to_visit = [this.root];
		let node_ordinal = 0;
		while (nodes_to_visit.length) {
			const node = nodes_to_visit.shift(); // get first element
			if (node.child_nodes.length) {
				for (const child of node.child_nodes) {
					nodes_to_visit.unshift(child);
				}
				this.internal_nodes.push(node);
			}
			else {
				node.set_ordinal(node_ordinal);
				node_ordinal += 1;
			}
		}
	}
}
PhyloTreeBase.debug = 0;

class PhyloNodeBase {
	compare_phylonodes_by_num_descendants(a, b) {
		return a.child_nodes.length - b.child_nodes.length;
	}

	constructor(params) {
		this.tree = params['tree'];
		this.newick_start = undefined;
		this.id = params['node_id'];
		this.branch_length = undefined;
		this.support = undefined;
		this.parent_node = undefined;
		this.child_nodes = [];
		this.class = "phylonode_base";
		if (this.id.length == 0) {
			let message = "id is missing in node constructor!!!\n";
			for (const key in params) {
				const paramType = typeof(params[key]);
				if (paramType != 'object')
					message += key + ": " + params[key] + "\n";
			}
			console.warn(message);
		}
		if (params['newick_start'])
			this.newick_start = params['newick_start'];
		this.branch_length = params['branch_length'];
		if (params['support'] != undefined)
			this.support = params['support'];
	}

	append_child(node) {
		this.child_nodes.push(node);
		node.parent_node = this;
	}

	set_id(new_id) {
		this.id = new_id;
	}

	get_descendant_nodes(des_nodes) {
		for (const node of this.child_nodes) {
			des_nodes.push(node);
			node.get_descendant_nodes(des_nodes);
		}
		return des_nodes;
	}

	get_descendant_left() {
		if (this.child_nodes.length > 0) {
			return this.child_nodes[0].get_descendant_left();
		}
		else
			return this;
	}

	get_descendant_right() {
		if (this.child_nodes.length > 0) {
			return this.child_nodes[this.child_nodes.length-1].get_descendant_right();
		}
		else
			return this;
	}

	get_parent() {
		return this.parent_node;
	}

	set_depth_from_children() {
		let max_child_depth = 0;
		for (const child of this.child_nodes) {
			if (child.depth > max_child_depth)
				max_child_depth = child.depth;
		}
		this.depth = (this.branch_length + max_child_depth);
	}

	set_ordinal(ord) {
		this.ordinal = ord;
	}

	get_min_descendant_tuple() {
		let min_des = [];
		for (const child of this.child_nodes) {
			min_des.push(child.min_des);
		}
		return min_des.sort().join();
	}

	set_min_descendant() {
		// min_des will be the minimum (alphabetically) of the ids of all descendant tips
		// must be set for all subtended nodes first (post-order traverse)
		if (this.child_nodes.length) {
			const children_min_des = [];
			for (const child of this.child_nodes) {
				children_min_des.push(child.min_des);
			}
			this.min_des = children_min_des.sort()[0];
		}
		else {
			this.min_des = this.id;
		}
	}

	calc_num_descendants() {
		if (this.child_nodes.length) {
			this.num_descendants = 0;
			for (const node of this.child_nodes) {
				this.num_descendants += node.num_descendants;
			}
		}
		else {
			this.num_descendants = 1;
		}
	}
	
	order_children_by_num_descendants(increasing = true) {
		if (this.child_nodes.length == 0)
			return;
		this.child_nodes.sort((a, b) => a.num_descendants - b.num_descendants);
		if (!increasing)
			this.child_nodes.reverse(); // biggest child down
	}

	compare_by_num_descendants(a, b) {
		if (a.num_descendants > b.num_descendants)
			return 1; // biggest first
		else if (a.num_descendants < b.num_descendants)
			return -1;
		return 0;
	}
}

global.PhyloTreeBase = PhyloTreeBase;
global.PhyloNodeBase = PhyloNodeBase;
return {
	PhyloTreeBase: PhyloTreeBase,
	PhyloNodeBase: PhyloNodeBase
};
});
