define([], function () {
  return function parseExpression(expression, field) {
    // console.log("Parse Expression: ", expression, field);

    var exprs = [];
    var exp = '';
    var expField = '';
    var openParans = 0;
    var subExp = '';
    var preOp = false;
    var prev = false;
    var ors = false;
    var quoted = false;

    for (var i = 0; i < expression.length; i++) {
      var curChar = expression[i];
      // console.log("curChar: ", curChar, i);
      switch (curChar) {
        case '"':
          if (!quoted) {
            quoted = true;
            exp = '"';
          } else {
            exp += '"';
            quoted = false;
          }
          break;
        case '(':
          openParans++;
          break;
        case ')':
          openParans--;

          if (openParans < 1) {
            var sub = parseExpression(subExp, expField);
            exprs.push(sub);
            subExp = '';
            expField = '';
          } else {
            throw Error("Unexpected ')' at character " + i);

          }

          // end current expression
          break;
        case ' ':
          if (openParans > 0) {
            subExp += curChar;
          } else if (quoted) {
            exp += curChar;
          } else if (exp) {
            // console.log("EXP: ", exp, "ORs: ", ors);
            if (exp.toLowerCase() == 'not') {
              preOp = 'not';
              exp = '';
              break;
            } else if (exp.toLowerCase() == 'or') {
              if (!ors) {
                var pe = exprs.pop();
                ors = [field ? prev : pe];
              }
              exp = '';
              // console.log("new ORs", ors);
              break;
            } else if (exp.toLowerCase() == 'and') {
              exp = '';
              break;
            }


            if (expField) {
              if (preOp == 'not') {
                exprs.push('ne(' + encodeURIComponent(expField) + ','  + encodeURIComponent(exp) + ')');
                preOp = false;
              } else {
                if (ors && ors.length > 1) {
                  exprs.push('in(' + encodeURIComponent(expField) + ',(' + ors.map(encodeURIComponent).join(',') + '))');
                  ors = false;
                } else {
                  exprs.push('eq(' + encodeURIComponent(expField) + ','  + encodeURIComponent(exp) + ')');
                }
              }
              expField = '';
            } else {
              var e = 'keyword(' + encodeURIComponent(exp) + ')';

              if (preOp == 'not') {
                exprs.push('not(' + e + ')');
                preOp = false;
              } else if (ors) {
                if (field) {
                  ors.push(exp);
                } else {
                  ors.push(e);
                }
              } else {
                exprs.push(e);
              }
            }
            prev = exp;
            exp = '';

          }
          break;

        case ':':
          if (openParans > 0) {
            subExp += curChar;
            break;
          }

          if (exp) {
            expField = exp;
            exp = '';
          } else {
            throw Error("Unexpected ':' at character " + i);
          }
          break;
        default:
          // console.log("Default Char Handler");
          if (openParans > 0) {
            subExp += curChar;
            break;
          }
          exp += curChar;
          break;
      }

    }

    // console.log("Finalize Expressions.  Expr:  ", exp, "ors: ", ors);
    var e;
    if (exp) {
      if (preOp == 'not') {
        if (expField) {
          exprs.push('ne(' + encodeURIComponent(expField) + ',' + encodeURIComponent(exp) + ')');
        } else {
          exprs.push('not(keyword(' + encodeURIComponent(exp) + '))');
        }
        preOp = false;
      } else {
        if (expField) {
          e = 'eq(' + encodeURIComponent(expField) + ','  + encodeURIComponent(exp) + ')';
          expField = '';
        } else {
          e = 'keyword(' + encodeURIComponent(exp) + ')';
        }

        if (ors) {
          if (field) {
            ors.push(exp);
            exprs.push('in(' + encodeURIComponent(field) + ',(' + ors.map(encodeURIComponent).join(',') + '))');
          } else {
            ors.push(e);
            exprs.push('or(' + ors.join(',') + ')');
          }
          ors = false;
        } else {
          exprs.push(e);
        }

      }

    }


    if (exprs.length == 1) {
      return exprs[0];
    }
    return 'and(' + exprs.join(',') + ')';

  };

});

