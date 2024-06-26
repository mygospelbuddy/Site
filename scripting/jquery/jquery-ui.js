! function(e, t) {
	var i, s = 0,
		n = /^ui-id-\d+$/;
	e.ui = e.ui || {}, e.extend(e.ui, {
		version: "1.10.4",
		keyCode: {
			BACKSPACE: 8,
			COMMA: 188,
			DELETE: 46,
			DOWN: 40,
			END: 35,
			ENTER: 13,
			ESCAPE: 27,
			HOME: 36,
			LEFT: 37,
			NUMPAD_ADD: 107,
			NUMPAD_DECIMAL: 110,
			NUMPAD_DIVIDE: 111,
			NUMPAD_ENTER: 108,
			NUMPAD_MULTIPLY: 106,
			NUMPAD_SUBTRACT: 109,
			PAGE_DOWN: 34,
			PAGE_UP: 33,
			PERIOD: 190,
			RIGHT: 39,
			SPACE: 32,
			TAB: 9,
			UP: 38
		}
	}), e.fn.extend({
		focus: (i = e.fn.focus, function(t, s) {
			return "number" == typeof t ? this.each(function() {
				var i = this;
				setTimeout(function() {
					e(i).focus(), s && s.call(i)
				}, t)
			}) : i.apply(this, arguments)
		}),
		scrollParent: function() {
			var t;
			return t = e.ui.ie && /(static|relative)/.test(this.css("position")) || /absolute/.test(this.css("position")) ? this.parents().filter(function() {
				return /(relative|absolute|fixed)/.test(e.css(this, "position")) && /(auto|scroll)/.test(e.css(this, "overflow") + e.css(this, "overflow-y") + e.css(this, "overflow-x"))
			}).eq(0) : this.parents().filter(function() {
				return /(auto|scroll)/.test(e.css(this, "overflow") + e.css(this, "overflow-y") + e.css(this, "overflow-x"))
			}).eq(0), /fixed/.test(this.css("position")) || !t.length ? e(document) : t
		},
		zIndex: function(t) {
			if (void 0 !== t) return this.css("zIndex", t);
			if (this.length)
				for (var i, s, n = e(this[0]); n.length && n[0] !== document;) {
					if (("absolute" === (i = n.css("position")) || "relative" === i || "fixed" === i) && (s = parseInt(n.css("zIndex"), 10), !isNaN(s) && 0 !== s)) return s;
					n = n.parent()
				}
			return 0
		},
		uniqueId: function() {
			return this.each(function() {
				this.id || (this.id = "ui-id-" + ++s)
			})
		},
		removeUniqueId: function() {
			return this.each(function() {
				n.test(this.id) && e(this).removeAttr("id")
			})
		}
	}), e.ui.ie = !!/msie [\w.]+/.exec(navigator.userAgent.toLowerCase()), e.support.selectstart = "onselectstart" in document.createElement("div"), e.fn.extend({
		disableSelection: function() {
			return this.bind((e.support.selectstart ? "selectstart" : "mousedown") + ".ui-disableSelection", function(e) {
				e.preventDefault()
			})
		},
		enableSelection: function() {
			return this.unbind(".ui-disableSelection")
		}
	}), e.extend(e.ui, {
		plugin: {
			add: function(t, i, s) {
				var n, o = e.ui[t].prototype;
				for (n in s) o.plugins[n] = o.plugins[n] || [], o.plugins[n].push([i, s[n]])
			},
			call: function(e, t, i) {
				var s, n = e.plugins[t];
				if (n && e.element[0].parentNode && 11 !== e.element[0].parentNode.nodeType)
					for (s = 0; s < n.length; s++) e.options[n[s][0]] && n[s][1].apply(e.element, i)
			}
		}
	})
}(jQuery),
function(e, t) {
	var i = 0,
		s = Array.prototype.slice,
		n = e.cleanData;
	e.cleanData = function(t) {
		for (var i, s = 0; null != (i = t[s]); s++) try {
			e(i).triggerHandler("remove")
		} catch (e) {}
		n(t)
	}, e.widget = function(t, i, s) {
		var n, o, a, u, r = {},
			l = t.split(".")[0];
		t = t.split(".")[1], n = l + "-" + t, s || (s = i, i = e.Widget), e.expr[":"][n.toLowerCase()] = function(t) {
			return !!e.data(t, n)
		}, e[l] = e[l] || {}, o = e[l][t], a = e[l][t] = function(e, t) {
			if (!this._createWidget) return new a(e, t);
			arguments.length && this._createWidget(e, t)
		}, e.extend(a, o, {
			version: s.version,
			_proto: e.extend({}, s),
			_childConstructors: []
		}), (u = new i).options = e.widget.extend({}, u.options), e.each(s, function(t, s) {
			var n, o;
			e.isFunction(s) ? r[t] = (n = function() {
				return i.prototype[t].apply(this, arguments)
			}, o = function(e) {
				return i.prototype[t].apply(this, e)
			}, function() {
				var e, t = this._super,
					i = this._superApply;
				return this._super = n, this._superApply = o, e = s.apply(this, arguments), this._super = t, this._superApply = i, e
			}) : r[t] = s
		}), a.prototype = e.widget.extend(u, {
			widgetEventPrefix: o && u.widgetEventPrefix || t
		}, r, {
			constructor: a,
			namespace: l,
			widgetName: t,
			widgetFullName: n
		}), o ? (e.each(o._childConstructors, function(t, i) {
			var s = i.prototype;
			e.widget(s.namespace + "." + s.widgetName, a, i._proto)
		}), delete o._childConstructors) : i._childConstructors.push(a), e.widget.bridge(t, a)
	}, e.widget.extend = function(i) {
		for (var n, o, a = s.call(arguments, 1), u = 0, r = a.length; u < r; u++)
			for (n in a[u]) o = a[u][n], a[u].hasOwnProperty(n) && o !== t && (e.isPlainObject(o) ? i[n] = e.isPlainObject(i[n]) ? e.widget.extend({}, i[n], o) : e.widget.extend({}, o) : i[n] = o);
		return i
	}, e.widget.bridge = function(i, n) {
		var o = n.prototype.widgetFullName || i;
		e.fn[i] = function(a) {
			var u = "string" == typeof a,
				r = s.call(arguments, 1),
				l = this;
			return a = !u && r.length ? e.widget.extend.apply(null, [a].concat(r)) : a, u ? this.each(function() {
				var s, n = e.data(this, o);
				return n ? e.isFunction(n[a]) && "_" !== a.charAt(0) ? (s = n[a].apply(n, r)) !== n && s !== t ? (l = s && s.jquery ? l.pushStack(s.get()) : s, !1) : void 0 : e.error("no such method '" + a + "' for " + i + " widget instance") : e.error("cannot call methods on " + i + " prior to initialization; attempted to call method '" + a + "'")
			}) : this.each(function() {
				var t = e.data(this, o);
				t ? t.option(a || {})._init() : e.data(this, o, new n(a, this))
			}), l
		}
	}, e.Widget = function() {}, e.Widget._childConstructors = [], e.Widget.prototype = {
		widgetName: "widget",
		widgetEventPrefix: "",
		defaultElement: "<div>",
		options: {
			disabled: !1,
			create: null
		},
		_createWidget: function(t, s) {
			s = e(s || this.defaultElement || this)[0], this.element = e(s), this.uuid = i++, this.eventNamespace = "." + this.widgetName + this.uuid, this.options = e.widget.extend({}, this.options, this._getCreateOptions(), t), this.bindings = e(), this.hoverable = e(), this.focusable = e(), s !== this && (e.data(s, this.widgetFullName, this), this._on(!0, this.element, {
				remove: function(e) {
					e.target === s && this.destroy()
				}
			}), this.document = e(s.style ? s.ownerDocument : s.document || s), this.window = e(this.document[0].defaultView || this.document[0].parentWindow)), this._create(), this._trigger("create", null, this._getCreateEventData()), this._init()
		},
		_getCreateOptions: e.noop,
		_getCreateEventData: e.noop,
		_create: e.noop,
		_init: e.noop,
		destroy: function() {
			this._destroy(), this.element.unbind(this.eventNamespace).removeData(this.widgetName).removeData(this.widgetFullName).removeData(e.camelCase(this.widgetFullName)), this.widget().unbind(this.eventNamespace).removeAttr("aria-disabled").removeClass(this.widgetFullName + "-disabled ui-state-disabled"), this.bindings.unbind(this.eventNamespace), this.hoverable.removeClass("ui-state-hover"), this.focusable.removeClass("ui-state-focus")
		},
		_destroy: e.noop,
		widget: function() {
			return this.element
		},
		option: function(i, s) {
			var n, o, a, u = i;
			if (0 === arguments.length) return e.widget.extend({}, this.options);
			if ("string" == typeof i)
				if (u = {}, i = (n = i.split(".")).shift(), n.length) {
					for (o = u[i] = e.widget.extend({}, this.options[i]), a = 0; a < n.length - 1; a++) o[n[a]] = o[n[a]] || {}, o = o[n[a]];
					if (i = n.pop(), 1 === arguments.length) return o[i] === t ? null : o[i];
					o[i] = s
				} else {
					if (1 === arguments.length) return this.options[i] === t ? null : this.options[i];
					u[i] = s
				} return this._setOptions(u), this
		},
		_setOptions: function(e) {
			var t;
			for (t in e) this._setOption(t, e[t]);
			return this
		},
		_setOption: function(e, t) {
			return this.options[e] = t, "disabled" === e && (this.widget().toggleClass(this.widgetFullName + "-disabled ui-state-disabled", !!t).attr("aria-disabled", t), this.hoverable.removeClass("ui-state-hover"), this.focusable.removeClass("ui-state-focus")), this
		},
		enable: function() {
			return this._setOption("disabled", !1)
		},
		disable: function() {
			return this._setOption("disabled", !0)
		},
		_on: function(t, i, s) {
			var n, o = this;
			"boolean" != typeof t && (s = i, i = t, t = !1), s ? (i = n = e(i), this.bindings = this.bindings.add(i)) : (s = i, i = this.element, n = this.widget()), e.each(s, function(s, a) {
				function u() {
					if (t || !0 !== o.options.disabled && !e(this).hasClass("ui-state-disabled")) return ("string" == typeof a ? o[a] : a).apply(o, arguments)
				}
				"string" != typeof a && (u.guid = a.guid = a.guid || u.guid || e.guid++);
				var r = s.match(/^(\w+)\s*(.*)$/),
					l = r[1] + o.eventNamespace,
					h = r[2];
				h ? n.delegate(h, l, u) : i.bind(l, u)
			})
		},
		_off: function(e, t) {
			t = (t || "").split(" ").join(this.eventNamespace + " ") + this.eventNamespace, e.unbind(t).undelegate(t)
		},
		_delay: function(e, t) {
			var i = this;
			return setTimeout(function() {
				return ("string" == typeof e ? i[e] : e).apply(i, arguments)
			}, t || 0)
		},
		_hoverable: function(t) {
			this.hoverable = this.hoverable.add(t), this._on(t, {
				mouseenter: function(t) {
					e(t.currentTarget).addClass("ui-state-hover")
				},
				mouseleave: function(t) {
					e(t.currentTarget).removeClass("ui-state-hover")
				}
			})
		},
		_focusable: function(t) {
			this.focusable = this.focusable.add(t), this._on(t, {
				focusin: function(t) {
					e(t.currentTarget).addClass("ui-state-focus")
				},
				focusout: function(t) {
					e(t.currentTarget).removeClass("ui-state-focus")
				}
			})
		},
		_trigger: function(t, i, s) {
			var n, o, a = this.options[t];
			if (s = s || {}, (i = e.Event(i)).type = (t === this.widgetEventPrefix ? t : this.widgetEventPrefix + t).toLowerCase(), i.target = this.element[0], o = i.originalEvent)
				for (n in o) n in i || (i[n] = o[n]);
			return this.element.trigger(i, s), !(e.isFunction(a) && !1 === a.apply(this.element[0], [i].concat(s)) || i.isDefaultPrevented())
		}
	}
}(jQuery),
function(e, t) {
	var i = !1;
	e(document).mouseup(function() {
		i = !1
	}), e.widget("ui.mouse", {
		version: "1.10.4",
		options: {
			cancel: "input,textarea,button,select,option",
			distance: 1,
			delay: 0
		},
		_mouseInit: function() {
			var t = this;
			this.element.bind("mousedown." + this.widgetName, function(e) {
				return t._mouseDown(e)
			}).bind("click." + this.widgetName, function(i) {
				if (!0 === e.data(i.target, t.widgetName + ".preventClickEvent")) return e.removeData(i.target, t.widgetName + ".preventClickEvent"), i.stopImmediatePropagation(), !1
			}), this.started = !1
		},
		_mouseDestroy: function() {
			this.element.unbind("." + this.widgetName), this._mouseMoveDelegate && e(document).unbind("mousemove." + this.widgetName, this._mouseMoveDelegate).unbind("mouseup." + this.widgetName, this._mouseUpDelegate)
		},
		_mouseDown: function(t) {
			if (!i) {
				this._mouseStarted && this._mouseUp(t), this._mouseDownEvent = t;
				var s = this,
					n = 1 === t.which,
					o = !("string" != typeof this.options.cancel || !t.target.nodeName) && e(t.target).closest(this.options.cancel).length;
				return !(n && !o && this._mouseCapture(t)) || (this.mouseDelayMet = !this.options.delay, this.mouseDelayMet || (this._mouseDelayTimer = setTimeout(function() {
					s.mouseDelayMet = !0
				}, this.options.delay)), this._mouseDistanceMet(t) && this._mouseDelayMet(t) && (this._mouseStarted = !1 !== this._mouseStart(t), !this._mouseStarted) ? (t.preventDefault(), !0) : (!0 === e.data(t.target, this.widgetName + ".preventClickEvent") && e.removeData(t.target, this.widgetName + ".preventClickEvent"), this._mouseMoveDelegate = function(e) {
					return s._mouseMove(e)
				}, this._mouseUpDelegate = function(e) {
					return s._mouseUp(e)
				}, e(document).bind("mousemove." + this.widgetName, this._mouseMoveDelegate).bind("mouseup." + this.widgetName, this._mouseUpDelegate), t.preventDefault(), i = !0, !0))
			}
		},
		_mouseMove: function(t) {
			return e.ui.ie && (!document.documentMode || document.documentMode < 9) && !t.button ? this._mouseUp(t) : this._mouseStarted ? (this._mouseDrag(t), t.preventDefault()) : (this._mouseDistanceMet(t) && this._mouseDelayMet(t) && (this._mouseStarted = !1 !== this._mouseStart(this._mouseDownEvent, t), this._mouseStarted ? this._mouseDrag(t) : this._mouseUp(t)), !this._mouseStarted)
		},
		_mouseUp: function(t) {
			return e(document).unbind("mousemove." + this.widgetName, this._mouseMoveDelegate).unbind("mouseup." + this.widgetName, this._mouseUpDelegate), this._mouseStarted && (this._mouseStarted = !1, t.target === this._mouseDownEvent.target && e.data(t.target, this.widgetName + ".preventClickEvent", !0), this._mouseStop(t)), !1
		},
		_mouseDistanceMet: function(e) {
			return Math.max(Math.abs(this._mouseDownEvent.pageX - e.pageX), Math.abs(this._mouseDownEvent.pageY - e.pageY)) >= this.options.distance
		},
		_mouseDelayMet: function() {
			return this.mouseDelayMet
		},
		_mouseStart: function() {},
		_mouseDrag: function() {},
		_mouseStop: function() {},
		_mouseCapture: function() {
			return !0
		}
	})
}(jQuery),
function(e, t) {
	e.ui = e.ui || {};
	var i, s = Math.max,
		n = Math.abs,
		o = Math.round,
		a = /left|center|right/,
		u = /top|center|bottom/,
		r = /[\+\-]\d+(\.[\d]+)?%?/,
		l = /^\w+/,
		h = /%$/,
		c = e.fn.position;

	function d(e, t, i) {
		return [parseFloat(e[0]) * (h.test(e[0]) ? t / 100 : 1), parseFloat(e[1]) * (h.test(e[1]) ? i / 100 : 1)]
	}

	function m(t, i) {
		return parseInt(e.css(t, i), 10) || 0
	}
	e.position = {
		scrollbarWidth: function() {
			if (void 0 !== i) return i;
			var t, s, n = e("<div style='display:block;position:absolute;width:50px;height:50px;overflow:hidden;'><div style='height:100px;width:auto;'></div></div>"),
				o = n.children()[0];
			return e("body").append(n), t = o.offsetWidth, n.css("overflow", "scroll"), t === (s = o.offsetWidth) && (s = n[0].clientWidth), n.remove(), i = t - s
		},
		getScrollInfo: function(t) {
			var i = t.isWindow || t.isDocument ? "" : t.element.css("overflow-x"),
				s = t.isWindow || t.isDocument ? "" : t.element.css("overflow-y"),
				n = "scroll" === i || "auto" === i && t.width < t.element[0].scrollWidth;
			return {
				width: "scroll" === s || "auto" === s && t.height < t.element[0].scrollHeight ? e.position.scrollbarWidth() : 0,
				height: n ? e.position.scrollbarWidth() : 0
			}
		},
		getWithinInfo: function(t) {
			var i = e(t || window),
				s = e.isWindow(i[0]);
			return {
				element: i,
				isWindow: s,
				isDocument: !!i[0] && 9 === i[0].nodeType,
				offset: i.offset() || {
					left: 0,
					top: 0
				},
				scrollLeft: i.scrollLeft(),
				scrollTop: i.scrollTop(),
				width: s ? i.width() : i.outerWidth(),
				height: s ? i.height() : i.outerHeight()
			}
		}
	}, e.fn.position = function(t) {
		if (!t || !t.of) return c.apply(this, arguments);
		t = e.extend({}, t);
		var i, h, p, f, v, g, _, b, y = e(t.of),
			w = e.position.getWithinInfo(t.within),
			x = e.position.getScrollInfo(w),
			C = (t.collision || "flip").split(" "),
			D = {};
		return g = 9 === (b = (_ = y)[0]).nodeType ? {
			width: _.width(),
			height: _.height(),
			offset: {
				top: 0,
				left: 0
			}
		} : e.isWindow(b) ? {
			width: _.width(),
			height: _.height(),
			offset: {
				top: _.scrollTop(),
				left: _.scrollLeft()
			}
		} : b.preventDefault ? {
			width: 0,
			height: 0,
			offset: {
				top: b.pageY,
				left: b.pageX
			}
		} : {
			width: _.outerWidth(),
			height: _.outerHeight(),
			offset: _.offset()
		}, y[0].preventDefault && (t.at = "left top"), h = g.width, p = g.height, f = g.offset, v = e.extend({}, f), e.each(["my", "at"], function() {
			var e, i, s = (t[this] || "").split(" ");
			1 === s.length && (s = a.test(s[0]) ? s.concat(["center"]) : u.test(s[0]) ? ["center"].concat(s) : ["center", "center"]), s[0] = a.test(s[0]) ? s[0] : "center", s[1] = u.test(s[1]) ? s[1] : "center", e = r.exec(s[0]), i = r.exec(s[1]), D[this] = [e ? e[0] : 0, i ? i[0] : 0], t[this] = [l.exec(s[0])[0], l.exec(s[1])[0]]
		}), 1 === C.length && (C[1] = C[0]), "right" === t.at[0] ? v.left += h : "center" === t.at[0] && (v.left += h / 2), "bottom" === t.at[1] ? v.top += p : "center" === t.at[1] && (v.top += p / 2), i = d(D.at, h, p), v.left += i[0], v.top += i[1], this.each(function() {
			var a, u, r = e(this),
				l = r.outerWidth(),
				c = r.outerHeight(),
				g = m(this, "marginLeft"),
				_ = m(this, "marginTop"),
				b = l + g + m(this, "marginRight") + x.width,
				E = c + _ + m(this, "marginBottom") + x.height,
				M = e.extend({}, v),
				N = d(D.my, r.outerWidth(), r.outerHeight());
			"right" === t.my[0] ? M.left -= l : "center" === t.my[0] && (M.left -= l / 2), "bottom" === t.my[1] ? M.top -= c : "center" === t.my[1] && (M.top -= c / 2), M.left += N[0], M.top += N[1], e.support.offsetFractions || (M.left = o(M.left), M.top = o(M.top)), a = {
				marginLeft: g,
				marginTop: _
			}, e.each(["left", "top"], function(s, n) {
				e.ui.position[C[s]] && e.ui.position[C[s]][n](M, {
					targetWidth: h,
					targetHeight: p,
					elemWidth: l,
					elemHeight: c,
					collisionPosition: a,
					collisionWidth: b,
					collisionHeight: E,
					offset: [i[0] + N[0], i[1] + N[1]],
					my: t.my,
					at: t.at,
					within: w,
					elem: r
				})
			}), t.using && (u = function(e) {
				var i = f.left - M.left,
					o = i + h - l,
					a = f.top - M.top,
					u = a + p - c,
					d = {
						target: {
							element: y,
							left: f.left,
							top: f.top,
							width: h,
							height: p
						},
						element: {
							element: r,
							left: M.left,
							top: M.top,
							width: l,
							height: c
						},
						horizontal: o < 0 ? "left" : i > 0 ? "right" : "center",
						vertical: u < 0 ? "top" : a > 0 ? "bottom" : "middle"
					};
				h < l && n(i + o) < h && (d.horizontal = "center"), p < c && n(a + u) < p && (d.vertical = "middle"), s(n(i), n(o)) > s(n(a), n(u)) ? d.important = "horizontal" : d.important = "vertical", t.using.call(this, e, d)
			}), r.offset(e.extend(M, {
				using: u
			}))
		})
	}, e.ui.position = {
		flipfit: {
			left: function() {
				e.ui.position.flip.left.apply(this, arguments), e.ui.position.fit.left.apply(this, arguments)
			},
			top: function() {
				e.ui.position.flip.top.apply(this, arguments), e.ui.position.fit.top.apply(this, arguments)
			}
		}
	}
}(jQuery),
function(e, t) {
	e.widget("ui.autocomplete", {
		version: "1.10.4",
		defaultElement: "<input>",
		options: {
			appendTo: null,
			autoFocus: !1,
			delay: 1,
			minLength: 1,
			position: {
				my: "left top",
				at: "left bottom",
				collision: "none"
			},
			source: null,
			change: null,
			close: null,
			focus: null,
			open: null,
			response: null,
			search: null,
			select: null
		},
		requestIndex: 0,
		pending: 0,
		_create: function() {
			var t, i, s, n = this.element[0].nodeName.toLowerCase(),
				o = "textarea" === n,
				a = "input" === n;
			this.isMultiLine = !!o || !a && this.element.prop("isContentEditable"), this.valueMethod = this.element[o || a ? "val" : "text"], this.isNewMenu = !0, this.element.addClass("ui-autocomplete-input").attr("autocomplete", "off"), this._on(this.element, {
				keydown: function(n) {
					if (this.element.prop("readOnly")) return t = !0, s = !0, void(i = !0);
					t = !1, s = !1, i = !1;
					var o = e.ui.keyCode;
					switch (n.keyCode) {
						case o.PAGE_UP:
							t = !0, this._move("previousPage", n);
							break;
						case o.PAGE_DOWN:
							t = !0, this._move("nextPage", n);
							break;
						case o.UP:
							t = !0, this._keyEvent("previous", n);
							break;
						case o.DOWN:
							t = !0, this._keyEvent("next", n);
							break;
						case o.ENTER:
						case o.NUMPAD_ENTER:
							this.menu.active && (t = !0, n.preventDefault(), this.menu.select(n));
							break;
						case o.TAB:
							this.menu.active && this.menu.select(n);
							break;
						case o.ESCAPE:
							this.menu.element.is(":visible") && (this._value(this.term), this.close(n), n.preventDefault());
							break;
						default:
							i = !0, this._searchTimeout(n)
					}
				},
				keypress: function(s) {
					if (t) return t = !1, void(this.isMultiLine && !this.menu.element.is(":visible") || s.preventDefault());
					if (!i) {
						var n = e.ui.keyCode;
						switch (s.keyCode) {
							case n.PAGE_UP:
								this._move("previousPage", s);
								break;
							case n.PAGE_DOWN:
								this._move("nextPage", s);
								break;
							case n.UP:
								this._keyEvent("previous", s);
								break;
							case n.DOWN:
								this._keyEvent("next", s)
						}
					}
				},
				input: function(e) {
					if (s) return s = !1, void e.preventDefault();
					this._searchTimeout(e)
				},
				focus: function() {
					this.selectedItem = null, this.previous = this._value()
				},
				blur: function(e) {
					this.cancelBlur ? delete this.cancelBlur : (clearTimeout(this.searching), this.close(e), this._change(e))
				}
			}), this._initSource(), this.menu = e("<ul>").addClass("ui-autocomplete ui-front").appendTo(this._appendTo()).menu({
				role: null
			}).hide().data("ui-menu"), this._on(this.menu.element, {
				mousedown: function(t) {
					t.preventDefault(), this.cancelBlur = !0, this._delay(function() {
						delete this.cancelBlur
					});
					var i = this.menu.element[0];
					e(t.target).closest(".ui-menu-item").length || this._delay(function() {
						var t = this;
						this.document.one("mousedown", function(s) {
							s.target === t.element[0] || s.target === i || e.contains(i, s.target) || t.close()
						})
					})
				},
				menufocus: function(t, i) {
					if (this.isNewMenu && (this.isNewMenu = !1, t.originalEvent && /^mouse/.test(t.originalEvent.type))) return this.menu.blur(), void this.document.one("mousemove", function() {
						e(t.target).trigger(t.originalEvent)
					});
					var s = i.item.data("ui-autocomplete-item");
					!1 !== this._trigger("focus", t, {
						item: s
					}) ? t.originalEvent && /^key/.test(t.originalEvent.type) && this._value(s.value) : this.liveRegion.text(s.value)
				},
				menuselect: function(e, t) {
					var i = t.item.data("ui-autocomplete-item"),
						s = this.previous;
					this.element[0] !== this.document[0].activeElement && (this.element.focus(), this.previous = s, this._delay(function() {
						this.previous = s, this.selectedItem = i
					})), !1 !== this._trigger("select", e, {
						item: i
					}) && this._value(i.value), this.term = this._value(), this.close(e), this.selectedItem = i
				}
			}), this.liveRegion = e("<span>", {
				role: "status",
				"aria-live": "polite"
			}).addClass("ui-helper-hidden-accessible").insertBefore(this.element), this._on(this.window, {
				beforeunload: function() {
					this.element.removeAttr("autocomplete")
				}
			})
		},
		_destroy: function() {
			clearTimeout(this.searching), this.element.removeClass("ui-autocomplete-input").removeAttr("autocomplete"), this.menu.element.remove(), this.liveRegion.remove()
		},
		_setOption: function(e, t) {
			this._super(e, t), "source" === e && this._initSource(), "appendTo" === e && this.menu.element.appendTo(this._appendTo()), "disabled" === e && t && this.xhr && this.xhr.abort()
		},
		_appendTo: function() {
			var t = this.options.appendTo;
			return t && (t = t.jquery || t.nodeType ? e(t) : this.document.find(t).eq(0)), t || (t = this.element.closest(".ui-front")), t.length || (t = this.document[0].body), t
		},
		_initSource: function() {
			var t, i, s = this;
			e.isArray(this.options.source) ? (t = this.options.source, this.source = function(i, s) {
				s(e.ui.autocomplete.filter(t, i.term))
			}) : "string" == typeof this.options.source ? (i = this.options.source, this.source = function(t, n) {
				s.xhr && s.xhr.abort(), s.xhr = e.ajax({
					url: i,
					data: t,
					dataType: "json",
					success: function(e) {
						n(e)
					},
					error: function() {
						n([])
					}
				})
			}) : this.source = this.options.source
		},
		_searchTimeout: function(e) {
			clearTimeout(this.searching), this.searching = this._delay(function() {
				this.term !== this._value() && (this.selectedItem = null, this.search(null, e))
			}, this.options.delay)
		},
		search: function(e, t) {
			return e = null != e ? e : this._value(), this.term = this._value(), e.length < this.options.minLength ? this.close(t) : !1 !== this._trigger("search", t) ? this._search(e) : void 0
		},
		_search: function(e) {
			this.pending++, this.element.addClass("ui-autocomplete-loading"), this.cancelSearch = !1, this.source({
				term: e
			}, this._response())
		},
		_response: function() {
			var t = ++this.requestIndex;
			return e.proxy(function(e) {
				t === this.requestIndex && this.__response(e), this.pending--, this.pending || this.element.removeClass("ui-autocomplete-loading")
			}, this)
		},
		__response: function(e) {
			e && (e = this._normalize(e)), this._trigger("response", null, {
				content: e
			}), !this.options.disabled && e && e.length && !this.cancelSearch ? (this._suggest(e), this._trigger("open")) : this._close()
		},
		close: function(e) {
			this.cancelSearch = !0, this._close(e)
		},
		_close: function(e) {
			this.menu.element.is(":visible") && (this.menu.element.hide(), this.menu.blur(), this.isNewMenu = !0, this._trigger("close", e))
		},
		_change: function(e) {
			this.previous !== this._value() && this._trigger("change", e, {
				item: this.selectedItem
			})
		},
		_normalize: function(t) {
			return t.length && t[0].label && t[0].value ? t : e.map(t, function(t) {
				return "string" == typeof t ? {
					label: t,
					value: t
				} : e.extend({
					label: t.label || t.value,
					value: t.value || t.label
				}, t)
			})
		},
		_suggest: function(t) {
			var i = this.menu.element.empty();
			this._renderMenu(i, t), this.isNewMenu = !0, this.menu.refresh(), i.show(), this._resizeMenu(), i.position(e.extend({
				of: this.element
			}, this.options.position)), this.options.autoFocus && this.menu.next()
		},
		_resizeMenu: function() {
			var e = this.menu.element;
			e.outerWidth(Math.max(e.width("").outerWidth() + 1, this.element.outerWidth()))
		},
		_renderMenu: function(t, i) {
			var s = this;
			e.each(i, function(e, i) {
				s._renderItemData(t, i)
			})
		},
		_renderItemData: function(e, t) {
			return this._renderItem(e, t).data("ui-autocomplete-item", t)
		},
		_renderItem: function(t, i) {
			return e("<li>").append(e("<a>").text(i.label)).appendTo(t)
		},
		_move: function(e, t) {
			if (this.menu.element.is(":visible")) return this.menu.isFirstItem() && /^previous/.test(e) || this.menu.isLastItem() && /^next/.test(e) ? (this._value(this.term), void this.menu.blur()) : void this.menu[e](t);
			this.search(null, t)
		},
		widget: function() {
			return this.menu.element
		},
		_value: function() {
			return this.valueMethod.apply(this.element, arguments)
		},
		_keyEvent: function(e, t) {
			this.isMultiLine && !this.menu.element.is(":visible") || (this._move(e, t), t.preventDefault())
		}
	}), e.extend(e.ui.autocomplete, {
		escapeRegex: function(e) {
			return e.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&")
		},
		filter: function(t, i) {
			var s = new RegExp(e.ui.autocomplete.escapeRegex(i), "i");
			return e.grep(t, function(e) {
				return s.test(e.label || e.value || e)
			})
		}
	})
}(jQuery),
function(e, t) {
	e.widget("ui.menu", {
		version: "1.10.4",
		defaultElement: "<ul>",
		delay: 300,
		options: {
			icons: {
				submenu: "ui-icon-carat-1-e"
			},
			menus: "ul",
			position: {
				my: "left top",
				at: "right top"
			},
			role: "menu",
			blur: null,
			focus: null,
			select: null
		},
		_create: function() {
			this.activeMenu = this.element, this.mouseHandled = !1, this.element.uniqueId().addClass("ui-menu ui-widget ui-widget-content ui-corner-all").toggleClass("ui-menu-icons", !!this.element.find(".ui-icon").length).attr({
				role: this.options.role,
				tabIndex: 0
			}).bind("click" + this.eventNamespace, e.proxy(function(e) {
				this.options.disabled && e.preventDefault()
			}, this)), this.options.disabled && this.element.addClass("ui-state-disabled").attr("aria-disabled", "true"), this._on({
				"mousedown .ui-menu-item > a": function(e) {
					e.preventDefault()
				},
				"click .ui-state-disabled > a": function(e) {
					e.preventDefault()
				},
				"click .ui-menu-item:has(a)": function(t) {
					var i = e(t.target).closest(".ui-menu-item");
					!this.mouseHandled && i.not(".ui-state-disabled").length && (this.select(t), t.isPropagationStopped() || (this.mouseHandled = !0), i.has(".ui-menu").length ? this.expand(t) : !this.element.is(":focus") && e(this.document[0].activeElement).closest(".ui-menu").length && (this.element.trigger("focus", [!0]), this.active && 1 === this.active.parents(".ui-menu").length && clearTimeout(this.timer)))
				},
				"mouseenter .ui-menu-item": function(t) {
					var i = e(t.currentTarget);
					i.siblings().children(".ui-state-active").removeClass("ui-state-active"), this.focus(t, i)
				},
				mouseleave: "collapseAll",
				"mouseleave .ui-menu": "collapseAll",
				focus: function(e, t) {
					var i = this.active || this.element.children(".ui-menu-item").eq(0);
					t || this.focus(e, i)
				},
				blur: function(t) {
					this._delay(function() {
						e.contains(this.element[0], this.document[0].activeElement) || this.collapseAll(t)
					})
				},
				keydown: "_keydown"
			}), this.refresh(), this._on(this.document, {
				click: function(t) {
					e(t.target).closest(".ui-menu").length || this.collapseAll(t), this.mouseHandled = !1
				}
			})
		},
		_destroy: function() {
			this.element.removeAttr("aria-activedescendant").find(".ui-menu").addBack().removeClass("ui-menu ui-widget ui-widget-content ui-corner-all ui-menu-icons").removeAttr("role").removeAttr("tabIndex").removeAttr("aria-labelledby").removeAttr("aria-expanded").removeAttr("aria-hidden").removeAttr("aria-disabled").removeUniqueId().show(), this.element.find(".ui-menu-item").removeClass("ui-menu-item").removeAttr("role").removeAttr("aria-disabled").children("a").removeUniqueId().removeClass("ui-corner-all ui-state-hover").removeAttr("tabIndex").removeAttr("role").removeAttr("aria-haspopup").children().each(function() {
				var t = e(this);
				t.data("ui-menu-submenu-carat") && t.remove()
			}), this.element.find(".ui-menu-divider").removeClass("ui-menu-divider ui-widget-content")
		},
		_keydown: function(t) {
			var i, s, n, o, a, u = !0;

			function r(e) {
				return e.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&")
			}
			switch (t.keyCode) {
				case e.ui.keyCode.PAGE_UP:
					this.previousPage(t);
					break;
				case e.ui.keyCode.PAGE_DOWN:
					this.nextPage(t);
					break;
				case e.ui.keyCode.HOME:
					this._move("first", "first", t);
					break;
				case e.ui.keyCode.END:
					this._move("last", "last", t);
					break;
				case e.ui.keyCode.UP:
					this.previous(t);
					break;
				case e.ui.keyCode.DOWN:
					this.next(t);
					break;
				case e.ui.keyCode.LEFT:
					this.collapse(t);
					break;
				case e.ui.keyCode.RIGHT:
					this.active && !this.active.is(".ui-state-disabled") && this.expand(t);
					break;
				case e.ui.keyCode.ENTER:
				case e.ui.keyCode.SPACE:
					this._activate(t);
					break;
				case e.ui.keyCode.ESCAPE:
					this.collapse(t);
					break;
				default:
					u = !1, s = this.previousFilter || "", n = String.fromCharCode(t.keyCode), o = !1, clearTimeout(this.filterTimer), n === s ? o = !0 : n = s + n, a = new RegExp("^" + r(n), "i"), i = this.activeMenu.children(".ui-menu-item").filter(function() {
						return a.test(e(this).children("a").text())
					}), (i = o && -1 !== i.index(this.active.next()) ? this.active.nextAll(".ui-menu-item") : i).length || (n = String.fromCharCode(t.keyCode), a = new RegExp("^" + r(n), "i"), i = this.activeMenu.children(".ui-menu-item").filter(function() {
						return a.test(e(this).children("a").text())
					})), i.length ? (this.focus(t, i), i.length > 1 ? (this.previousFilter = n, this.filterTimer = this._delay(function() {
						delete this.previousFilter
					}, 1e3)) : delete this.previousFilter) : delete this.previousFilter
			}
			u && t.preventDefault()
		},
		_activate: function(e) {
			this.active.is(".ui-state-disabled") || (this.active.children("a[aria-haspopup='true']").length ? this.expand(e) : this.select(e))
		},
		refresh: function() {
			var t, i = this.options.icons.submenu,
				s = this.element.find(this.options.menus);
			this.element.toggleClass("ui-menu-icons", !!this.element.find(".ui-icon").length), s.filter(":not(.ui-menu)").addClass("ui-menu ui-widget ui-widget-content ui-corner-all").hide().attr({
				role: this.options.role,
				"aria-hidden": "true",
				"aria-expanded": "false"
			}).each(function() {
				var t = e(this),
					s = t.prev("a"),
					n = e("<span>").addClass("ui-menu-icon ui-icon " + i).data("ui-menu-submenu-carat", !0);
				s.attr("aria-haspopup", "true").prepend(n), t.attr("aria-labelledby", s.attr("id"))
			}), (t = s.add(this.element)).children(":not(.ui-menu-item):has(a)").addClass("ui-menu-item").attr("role", "presentation").children("a").uniqueId().addClass("ui-corner-all").attr({
				tabIndex: -1,
				role: this._itemRole()
			}), t.children(":not(.ui-menu-item)").each(function() {
				var t = e(this);
				/[^\-\u2014\u2013\s]/.test(t.text()) || t.addClass("ui-widget-content ui-menu-divider")
			}), t.children(".ui-state-disabled").attr("aria-disabled", "true"), this.active && !e.contains(this.element[0], this.active[0]) && this.blur()
		},
		_itemRole: function() {
			return {
				menu: "menuitem",
				listbox: "option"
			} [this.options.role]
		},
		_setOption: function(e, t) {
			"icons" === e && this.element.find(".ui-menu-icon").removeClass(this.options.icons.submenu).addClass(t.submenu), this._super(e, t)
		},
		focus: function(e, t) {
			var i, s;
			this.blur(e, e && "focus" === e.type), this._scrollIntoView(t), this.active = t.first(), s = this.active.children("a").addClass("ui-state-focus"), this.options.role && this.element.attr("aria-activedescendant", s.attr("id")), this.active.parent().closest(".ui-menu-item").children("a:first").addClass("ui-state-active"), e && "keydown" === e.type ? this._close() : this.timer = this._delay(function() {
				this._close()
			}, this.delay), (i = t.children(".ui-menu")).length && e && /^mouse/.test(e.type) && this._startOpening(i), this.activeMenu = t.parent(), this._trigger("focus", e, {
				item: t
			})
		},
		_scrollIntoView: function(t) {
			var i, s, n, o, a, u;
			this._hasScroll() && (i = parseFloat(e.css(this.activeMenu[0], "borderTopWidth")) || 0, s = parseFloat(e.css(this.activeMenu[0], "paddingTop")) || 0, n = t.offset().top - this.activeMenu.offset().top - i - s, o = this.activeMenu.scrollTop(), a = this.activeMenu.height(), u = t.height(), n < 0 ? this.activeMenu.scrollTop(o + n) : n + u > a && this.activeMenu.scrollTop(o + n - a + u))
		},
		blur: function(e, t) {
			t || clearTimeout(this.timer), this.active && (this.active.children("a").removeClass("ui-state-focus"), this.active = null, this._trigger("blur", e, {
				item: this.active
			}))
		},
		_startOpening: function(e) {
			clearTimeout(this.timer), "true" === e.attr("aria-hidden") && (this.timer = this._delay(function() {
				this._close(), this._open(e)
			}, this.delay))
		},
		_open: function(t) {
			var i = e.extend({
				of: this.active
			}, this.options.position);
			clearTimeout(this.timer), this.element.find(".ui-menu").not(t.parents(".ui-menu")).hide().attr("aria-hidden", "true"), t.show().removeAttr("aria-hidden").attr("aria-expanded", "true").position(i)
		},
		collapseAll: function(t, i) {
			clearTimeout(this.timer), this.timer = this._delay(function() {
				var s = i ? this.element : e(t && t.target).closest(this.element.find(".ui-menu"));
				s.length || (s = this.element), this._close(s), this.blur(t), this.activeMenu = s
			}, this.delay)
		},
		_close: function(e) {
			e || (e = this.active ? this.active.parent() : this.element), e.find(".ui-menu").hide().attr("aria-hidden", "true").attr("aria-expanded", "false").end().find("a.ui-state-active").removeClass("ui-state-active")
		},
		collapse: function(e) {
			var t = this.active && this.active.parent().closest(".ui-menu-item", this.element);
			t && t.length && (this._close(), this.focus(e, t))
		},
		expand: function(e) {
			var t = this.active && this.active.children(".ui-menu ").children(".ui-menu-item").first();
			t && t.length && (this._open(t.parent()), this._delay(function() {
				this.focus(e, t)
			}))
		},
		next: function(e) {
			this._move("next", "first", e)
		},
		previous: function(e) {
			this._move("prev", "last", e)
		},
		isFirstItem: function() {
			return this.active && !this.active.prevAll(".ui-menu-item").length
		},
		isLastItem: function() {
			return this.active && !this.active.nextAll(".ui-menu-item").length
		},
		_move: function(e, t, i) {
			var s;
			this.active && (s = "first" === e || "last" === e ? this.active["first" === e ? "prevAll" : "nextAll"](".ui-menu-item").eq(-1) : this.active[e + "All"](".ui-menu-item").eq(0)), s && s.length && this.active || (s = this.activeMenu.children(".ui-menu-item")[t]()), this.focus(i, s)
		},
		nextPage: function(t) {
			var i, s, n;
			this.active ? this.isLastItem() || (this._hasScroll() ? (s = this.active.offset().top, n = this.element.height(), this.active.nextAll(".ui-menu-item").each(function() {
				return (i = e(this)).offset().top - s - n < 0
			}), this.focus(t, i)) : this.focus(t, this.activeMenu.children(".ui-menu-item")[this.active ? "last" : "first"]())) : this.next(t)
		},
		previousPage: function(t) {
			var i, s, n;
			this.active ? this.isFirstItem() || (this._hasScroll() ? (s = this.active.offset().top, n = this.element.height(), this.active.prevAll(".ui-menu-item").each(function() {
				return (i = e(this)).offset().top - s + n > 0
			}), this.focus(t, i)) : this.focus(t, this.activeMenu.children(".ui-menu-item").first())) : this.next(t)
		},
		_hasScroll: function() {
			return this.element.outerHeight() < this.element.prop("scrollHeight")
		},
		select: function(t) {
			this.active = this.active || e(t.target).closest(".ui-menu-item");
			var i = {
				item: this.active
			};
			this.active.has(".ui-menu").length || this.collapseAll(t, !0), this._trigger("select", t, i)
		}
	})
}(jQuery);