<a href="http://promises-aplus.github.com/promises-spec">
    <img src="http://promises-aplus.github.com/promises-spec/assets/logo-small.png"
         align="right" alt="Promises/A+ logo" />
</a>

# Zousan
An absolutely Lightning Fast, Yet Very Small Promise A+ Compliant Promise

---
Zousan is a "Promise A+ 1.1" Compliant Promise implementation.

There are already several Promise implementations out there, and modern browsers even have built-in Promises, but none met my goals, which are:

1. **Exceedingly Fast** - it had to be the fastest possible implementation, so it could be used excessively throughout a codebase with impunity.
2. **Extremely Small** - I will be using this in all my future projects, including mobile, and so fast and efficient code is essential. Also, the less code there is, the less can go wrong.
3. **Clearly written and Documented** - I want to clearly see (and clearly demonstrate to others) how the code works, both to build confidence in its correctness, and to make it easier to fix/maintain if/when necessary.
4. **Usable Everywhere** - I required compatability with browsers (both new and old), mobile devices, Node and even make a best effort to work in unknown environments.
5. **Simple Build** - No dependencies, few files, dog bone simple. (is that a phrase?) 

## FAQ

**Q: What does "Zousan" mean?**

Well, if you had a 3-year-old Japanese child, you would know, now wouldn't you!?  "Zou" is the Japanese word for "Elephant". "San" is an honorific suffix placed after someone's name or title to show respect. Children (and other kawaii people) often put "san" after animal names as a sign of respect to the animals.. and just to be kawaii.

[Here is a video that might help](https://www.youtube.com/watch?v=rEsNUJp9dcM)

[And if you need more guidance (or just enjoy these as much as I do) here is another](https://www.youtube.com/watch?v=b4KYDBBB6UQ) - **Zousan Da-ta!!**

**Q: Ok, cute - but why name it after an Elephant?**

Because elephants never forget. So you can depend on them to keep their promises!

**Q: Just how fast is it?**

I set up a [jsperf comparison](http://jsperf.com/promise-speed-comparison/2) between:

* [Zousan](https://github.com/bluejava/zousan) (2,117 bytes minified)
* [Bluebird](https://github.com/petkaantonov/bluebird) (72,282 bytes minified) - Considered the king of high-performance Promises 
* [When](https://github.com/cujojs/when) (12,474 bytes minified) - An extremely popular and highly performant Promises implementation
* Native Promises - Built into all recent browsers *except IE*.

**Note: Graph illustrates *operations per second*, so longer bars are better.**

![](http://www.bluejava.com/int/images/Zousan-Performance.png)
